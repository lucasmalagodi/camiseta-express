import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { query, pool } from '../config/db';

const execAsync = promisify(exec);

interface BackupRecord {
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    type: 'MANUAL' | 'AUTO';
    status: 'PROCESSING' | 'DONE' | 'FAILED';
    created_at: Date;
    finished_at: Date | null;
    error_message: string | null;
}

export const backupService = {
    /**
     * Cria um novo registro de backup no banco de dados
     */
    async createBackupRecord(type: 'MANUAL' | 'AUTO'): Promise<number> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup-${type.toLowerCase()}-${timestamp}.tar.gz`;
        const backupDir = '/var/backups/ancdcampanha';
        const filePath = path.join(backupDir, fileName);

        // Garantir que o diretório existe
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const result = await query(
            `INSERT INTO backups (file_name, file_path, type, status, created_at) 
             VALUES (?, ?, ?, 'PROCESSING', NOW())`,
            [fileName, filePath, type]
        ) as any;

        return result.insertId;
    },

    /**
     * Atualiza o status do backup
     */
    async updateBackupStatus(
        id: number,
        status: 'PROCESSING' | 'DONE' | 'FAILED',
        fileSize?: number,
        errorMessage?: string
    ): Promise<void> {
        const updates: string[] = ['status = ?'];
        const values: any[] = [status];

        if (status === 'DONE' || status === 'FAILED') {
            updates.push('finished_at = NOW()');
        }

        if (fileSize !== undefined) {
            updates.push('file_size = ?');
            values.push(fileSize);
        }

        if (errorMessage) {
            updates.push('error_message = ?');
            values.push(errorMessage);
        }

        await query(
            `UPDATE backups SET ${updates.join(', ')} WHERE id = ?`,
            [...values, id]
        );
    },

    /**
     * Gera o dump do MySQL usando conexão direta (mais confiável que docker exec)
     */
    async generateDatabaseDump(dumpPath: string): Promise<void> {
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbUser = process.env.DB_USER || 'root';
        const dbPassword = process.env.DB_PASSWORD || '';
        const dbName = process.env.DB_NAME || 'ftsancd';

        // Primeiro, tentar usar mysqldump via docker exec (se disponível)
        if (dbHost === 'mysql') {
            const containerName = 'ftsancd_mysql';
            
            try {
                // Verificar se docker está disponível
                await execAsync('which docker');
                
                // Tentar executar mysqldump dentro do container
                const mysqldumpCmd = `docker exec ${containerName} mysqldump -u ${dbUser} -p${dbPassword} ${dbName}`;
                const { stdout } = await execAsync(mysqldumpCmd);
                fs.writeFileSync(dumpPath, stdout);
                return;
            } catch (dockerError: any) {
                console.log('[Backup] Docker exec não disponível, usando método alternativo via conexão MySQL');
                // Continuar para método alternativo
            }
        }

        // Método alternativo: tentar mysqldump localmente
        try {
            await execAsync('which mysqldump');
            
            const host = dbHost === 'mysql' ? 'localhost' : dbHost;
            const mysqldumpCmd = `mysqldump -h ${host} -u ${dbUser} -p${dbPassword} ${dbName} > ${dumpPath}`;
            
            try {
                await execAsync(mysqldumpCmd);
                return;
            } catch (error: any) {
                // Tentar sem senha
                const mysqldumpCmdNoPass = `mysqldump -h ${host} -u ${dbUser} ${dbName} > ${dumpPath}`;
                try {
                    await execAsync(mysqldumpCmdNoPass);
                    return;
                } catch (error2: any) {
                    console.log('[Backup] mysqldump local falhou, usando método via Node.js');
                    // Continuar para método via Node.js
                }
            }
        } catch (error: any) {
            console.log('[Backup] mysqldump não encontrado, usando método via Node.js');
            // Continuar para método via Node.js
        }

        // Método final: gerar dump via conexão MySQL usando Node.js
        // Este método é mais lento mas funciona sempre que há conexão com o banco
        await this.generateDumpViaConnection(dumpPath, dbName);
    },

    /**
     * Gera dump do banco via conexão MySQL (método alternativo)
     */
    async generateDumpViaConnection(dumpPath: string, dbName: string): Promise<void> {
        const connection = await pool.getConnection();
        const dumpLines: string[] = [];

        try {
            // Cabeçalho do dump
            dumpLines.push('-- MySQL dump');
            dumpLines.push(`-- Database: ${dbName}`);
            dumpLines.push(`-- Generated: ${new Date().toISOString()}`);
            dumpLines.push('');
            dumpLines.push('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');
            dumpLines.push('SET time_zone = "+00:00";');
            dumpLines.push('');
            dumpLines.push('/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;');
            dumpLines.push('/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;');
            dumpLines.push('/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;');
            dumpLines.push('/*!50503 SET NAMES utf8mb4 */;');
            dumpLines.push('/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;');
            dumpLines.push('/*!40103 SET TIME_ZONE=\'+00:00\' */;');
            dumpLines.push('/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;');
            dumpLines.push('/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;');
            dumpLines.push('/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE=\'NO_AUTO_VALUE_ON_ZERO\' */;');
            dumpLines.push('/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;');
            dumpLines.push('');

            // Obter lista de tabelas
            const [tables] = await connection.execute(
                `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
                [dbName]
            ) as any[];

            // Para cada tabela, gerar CREATE TABLE e INSERTs
            for (const table of tables) {
                const tableName = table.TABLE_NAME;
                
                // Obter estrutura da tabela
                const [createTable] = await connection.execute(
                    `SHOW CREATE TABLE \`${tableName}\``
                ) as any[];
                
                if (createTable.length > 0) {
                    dumpLines.push(`--`);
                    dumpLines.push(`-- Table structure for table \`${tableName}\``);
                    dumpLines.push(`--`);
                    dumpLines.push('');
                    dumpLines.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
                    dumpLines.push('/*!40101 SET @saved_cs_client     = @@character_set_client */;');
                    dumpLines.push('/*!50503 SET character_set_client = utf8mb4 */;');
                    
                    // Processar CREATE TABLE para remover larguras de display depreciadas (MySQL 8.0+)
                    let createTableSql = createTable[0]['Create Table'];
                    // Remover larguras de display de INT, TINYINT, SMALLINT, MEDIUMINT, BIGINT
                    createTableSql = createTableSql.replace(/\b(INT|TINYINT|SMALLINT|MEDIUMINT|BIGINT)\(\d+\)/gi, '$1');
                    
                    dumpLines.push(createTableSql + ';');
                    dumpLines.push('/*!40101 SET character_set_client = @saved_cs_client */;');
                    dumpLines.push('');

                    // Obter dados da tabela
                    const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``) as any[];
                    
                    if (rows.length > 0) {
                        dumpLines.push(`--`);
                        dumpLines.push(`-- Dumping data for table \`${tableName}\``);
                        dumpLines.push(`--`);
                        dumpLines.push('');
                        
                        // Não usar LOCK TABLES para evitar bloqueios
                        // Desabilitar verificação de chaves estrangeiras temporariamente para melhor performance
                        dumpLines.push('SET FOREIGN_KEY_CHECKS=0;');
                        dumpLines.push('/*!40000 ALTER TABLE `' + tableName + '` DISABLE KEYS */;');
                        
                        // Obter colunas
                        const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(',');
                        
                        // Gerar INSERTs em lotes
                        const batchSize = 100;
                        for (let i = 0; i < rows.length; i += batchSize) {
                            const batch = rows.slice(i, i + batchSize);
                            const values = batch.map((row: any) => {
                                const rowValues = Object.keys(rows[0]).map((col: string) => {
                                    const val = row[col];
                                    if (val === null || val === undefined) return 'NULL';
                                    if (typeof val === 'string') {
                                        // Escapar caracteres especiais
                                        const escaped = val
                                            .replace(/\\/g, '\\\\')
                                            .replace(/'/g, "\\'")
                                            .replace(/\n/g, '\\n')
                                            .replace(/\r/g, '\\r')
                                            .replace(/\t/g, '\\t');
                                        return `'${escaped}'`;
                                    }
                                    if (val instanceof Date) {
                                        return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                                    }
                                    if (typeof val === 'boolean') {
                                        return val ? '1' : '0';
                                    }
                                    return String(val);
                                });
                                return `(${rowValues.join(',')})`;
                            });
                            
                            dumpLines.push(`INSERT INTO \`${tableName}\` (${columns}) VALUES ${values.join(',')};`);
                        }
                        
                        dumpLines.push('/*!40000 ALTER TABLE `' + tableName + '` ENABLE KEYS */;');
                        dumpLines.push('SET FOREIGN_KEY_CHECKS=1;');
                        dumpLines.push('');
                    }
                }
            }

            // Rodapé do dump
            dumpLines.push('/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;');
            dumpLines.push('/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;');
            dumpLines.push('/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;');
            dumpLines.push('/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;');
            dumpLines.push('/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;');
            dumpLines.push('/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;');
            dumpLines.push('/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;');
            dumpLines.push('/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;');

            // Escrever arquivo
            fs.writeFileSync(dumpPath, dumpLines.join('\n'), 'utf8');
        } finally {
            connection.release();
        }
    },

    /**
     * Obtém o caminho base dos assets
     */
    getAssetsPath(): string {
        const dockerPath = '/src/assets';
        const devPath = path.resolve(__dirname, '../../src/assets');
        const serverPath = '/var/www/ancdcampanha/fts/src/assets';

        // Priorizar caminho do Docker em produção
        if (process.env.NODE_ENV === 'production' || fs.existsSync(dockerPath)) {
            return dockerPath;
        }

        // Fallback para servidor
        if (fs.existsSync(serverPath)) {
            return serverPath;
        }

        // Fallback para desenvolvimento
        return devPath;
    },

    /**
     * Cria o backup completo
     */
    async createBackup(type: 'MANUAL' | 'AUTO'): Promise<number> {
        const backupId = await this.createBackupRecord(type);
        const tempDir = `/tmp/backup-${backupId}`;
        const backupDir = '/var/backups/ancdcampanha';

        try {
            // Criar diretório temporário
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // 1. Gerar dump do banco de dados
            const dumpPath = path.join(tempDir, 'database.sql');
            console.log(`[Backup ${backupId}] Gerando dump do banco de dados...`);
            await this.generateDatabaseDump(dumpPath);

            // 2. Copiar pasta de uploads (assets/product)
            const assetsPath = this.getAssetsPath();
            const uploadsPath = path.join(assetsPath, 'product');
            
            if (fs.existsSync(uploadsPath)) {
                console.log(`[Backup ${backupId}] Copiando pasta de uploads...`);
                const uploadsBackupPath = path.join(tempDir, 'uploads');
                await execAsync(`cp -r "${uploadsPath}" "${uploadsBackupPath}"`);
            }

            // 3. Copiar outros assets importantes (se existirem)
            const spreadsheetsPath = path.join(assetsPath, 'spreadsheets');
            if (fs.existsSync(spreadsheetsPath)) {
                console.log(`[Backup ${backupId}] Copiando planilhas...`);
                const spreadsheetsBackupPath = path.join(tempDir, 'spreadsheets');
                await execAsync(`cp -r "${spreadsheetsPath}" "${spreadsheetsBackupPath}"`);
            }

            // 4. Criar arquivo de informações do backup
            const infoPath = path.join(tempDir, 'backup-info.txt');
            const infoContent = `Backup gerado em: ${new Date().toISOString()}
Tipo: ${type}
ID: ${backupId}
`;
            fs.writeFileSync(infoPath, infoContent);

            // 5. Comprimir tudo em .tar.gz
            const backupRecord = await this.getBackupById(backupId);
            if (!backupRecord) {
                throw new Error('Registro de backup não encontrado');
            }

            const finalPath = backupRecord.file_path;
            console.log(`[Backup ${backupId}] Comprimindo arquivos...`);
            
            // Garantir que o diretório de destino existe
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            await execAsync(`cd "${tempDir}" && tar -czf "${finalPath}" .`);

            // 6. Obter tamanho do arquivo
            const stats = fs.statSync(finalPath);
            const fileSize = stats.size;

            // 7. Atualizar status para DONE
            await this.updateBackupStatus(backupId, 'DONE', fileSize);

            // 8. Limpar diretório temporário
            await execAsync(`rm -rf "${tempDir}"`);

            console.log(`[Backup ${backupId}] Backup concluído com sucesso! Tamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

            return backupId;
        } catch (error: any) {
            console.error(`[Backup ${backupId}] Erro ao criar backup:`, error);
            
            // Atualizar status para FAILED
            await this.updateBackupStatus(
                backupId,
                'FAILED',
                undefined,
                error.message || 'Erro desconhecido'
            );

            // Limpar diretório temporário em caso de erro
            try {
                if (fs.existsSync(tempDir)) {
                    await execAsync(`rm -rf "${tempDir}"`);
                }
            } catch (cleanupError) {
                console.error(`[Backup ${backupId}] Erro ao limpar diretório temporário:`, cleanupError);
            }

            throw error;
        }
    },

    /**
     * Lista todos os backups
     */
    async listBackups(): Promise<BackupRecord[]> {
        const results = await query(
            `SELECT * FROM backups ORDER BY created_at DESC`
        ) as any[];

        return results.map(row => ({
            id: row.id,
            file_name: row.file_name,
            file_path: row.file_path,
            file_size: row.file_size || 0,
            type: row.type,
            status: row.status,
            created_at: row.created_at,
            finished_at: row.finished_at,
            error_message: row.error_message
        }));
    },

    /**
     * Obtém um backup por ID
     */
    async getBackupById(id: number): Promise<BackupRecord | null> {
        const results = await query(
            `SELECT * FROM backups WHERE id = ?`,
            [id]
        ) as any[];

        if (results.length === 0) {
            return null;
        }

        const row = results[0];
        return {
            id: row.id,
            file_name: row.file_name,
            file_path: row.file_path,
            file_size: row.file_size || 0,
            type: row.type,
            status: row.status,
            created_at: row.created_at,
            finished_at: row.finished_at,
            error_message: row.error_message
        };
    },

    /**
     * Deleta um backup
     */
    async deleteBackup(id: number): Promise<void> {
        const backup = await this.getBackupById(id);
        if (!backup) {
            throw new Error('Backup não encontrado');
        }

        // Deletar arquivo físico
        if (fs.existsSync(backup.file_path)) {
            fs.unlinkSync(backup.file_path);
        }

        // Deletar registro do banco
        await query('DELETE FROM backups WHERE id = ?', [id]);
    },

    /**
     * Aplica política de retenção (mantém apenas os últimos N backups automáticos)
     */
    async applyRetentionPolicy(keepCount: number = 7): Promise<void> {
        // Buscar backups automáticos ordenados por data (mais recentes primeiro)
        const results = await query(
            `SELECT id FROM backups 
             WHERE type = 'AUTO' AND status = 'DONE' 
             ORDER BY created_at DESC`
        ) as any[];

        // Se houver mais backups do que o permitido, deletar os mais antigos
        if (results.length > keepCount) {
            const backupsToDelete = results.slice(keepCount);
            
            for (const backup of backupsToDelete) {
                console.log(`[Retention] Deletando backup antigo: ${backup.id}`);
                await this.deleteBackup(backup.id);
            }

            console.log(`[Retention] Política aplicada: ${backupsToDelete.length} backups antigos deletados`);
        }
    },

    /**
     * Valida um backup
     */
    async validateBackup(id: number): Promise<{
        valid: boolean;
        checks: {
            fileExists: boolean;
            fileSizeValid: boolean;
            archiveValid: boolean;
            sqlDumpValid: boolean;
            uploadsPresent: boolean;
        };
        errors: string[];
        warnings: string[];
    }> {
        const backup = await this.getBackupById(id);
        if (!backup) {
            throw new Error('Backup não encontrado');
        }

        const checks = {
            fileExists: false,
            fileSizeValid: false,
            archiveValid: false,
            sqlDumpValid: false,
            uploadsPresent: false
        };
        const errors: string[] = [];
        const warnings: string[] = [];
        const tempDir = `/tmp/backup-validation-${id}`;

        try {
            // 1. Verificar se arquivo existe
            if (fs.existsSync(backup.file_path)) {
                checks.fileExists = true;
            } else {
                errors.push(`Arquivo de backup não encontrado: ${backup.file_path}`);
                return { valid: false, checks, errors, warnings };
            }

            // 2. Verificar tamanho do arquivo
            const stats = fs.statSync(backup.file_path);
            if (stats.size > 0) {
                checks.fileSizeValid = true;
                if (stats.size < 1024) {
                    warnings.push('Arquivo de backup muito pequeno (menos de 1KB)');
                }
            } else {
                errors.push('Arquivo de backup está vazio');
                return { valid: false, checks, errors, warnings };
            }

            // 3. Extrair e validar arquivo tar.gz
            try {
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                // Extrair arquivo
                await execAsync(`cd "${tempDir}" && tar -xzf "${backup.file_path}"`);

                // Verificar se extraiu corretamente
                const extractedFiles = fs.readdirSync(tempDir);
                if (extractedFiles.length > 0) {
                    checks.archiveValid = true;
                } else {
                    errors.push('Arquivo tar.gz extraído mas está vazio');
                    return { valid: false, checks, errors, warnings };
                }

                // 4. Validar dump SQL
                const sqlDumpPath = path.join(tempDir, 'database.sql');
                if (fs.existsSync(sqlDumpPath)) {
                    const sqlContent = fs.readFileSync(sqlDumpPath, 'utf8');
                    
                    // Verificar se tem conteúdo mínimo
                    if (sqlContent.length > 100) {
                        // Verificar se tem estruturas esperadas
                        const hasCreateTable = /CREATE TABLE/i.test(sqlContent);
                        const hasInsert = /INSERT INTO/i.test(sqlContent);
                        const hasSetStatements = /SET.*CHARACTER_SET/i.test(sqlContent);

                        if (hasCreateTable || hasInsert || hasSetStatements) {
                            checks.sqlDumpValid = true;
                        } else {
                            warnings.push('Dump SQL não contém estruturas esperadas (CREATE TABLE, INSERT, etc)');
                        }

                        // Contar tabelas no dump
                        const tableMatches = sqlContent.match(/CREATE TABLE `([^`]+)`/gi);
                        if (tableMatches) {
                            console.log(`[Validation] Encontradas ${tableMatches.length} tabelas no dump`);
                        }
                    } else {
                        errors.push('Dump SQL muito pequeno ou vazio');
                    }
                } else {
                    errors.push('Arquivo database.sql não encontrado no backup');
                }

                // 5. Verificar se pasta de uploads existe
                const uploadsPath = path.join(tempDir, 'uploads');
                if (fs.existsSync(uploadsPath)) {
                    checks.uploadsPresent = true;
                    const uploadsStats = fs.statSync(uploadsPath);
                    if (uploadsStats.isDirectory()) {
                        const uploadFiles = fs.readdirSync(uploadsPath);
                        if (uploadFiles.length === 0) {
                            warnings.push('Pasta de uploads existe mas está vazia');
                        }
                    }
                } else {
                    warnings.push('Pasta de uploads não encontrada no backup');
                }

                // Verificar arquivo de informações
                const infoPath = path.join(tempDir, 'backup-info.txt');
                if (!fs.existsSync(infoPath)) {
                    warnings.push('Arquivo backup-info.txt não encontrado');
                }

            } catch (extractError: any) {
                errors.push(`Erro ao extrair arquivo tar.gz: ${extractError.message}`);
                checks.archiveValid = false;
            } finally {
                // Limpar diretório temporário
                try {
                    if (fs.existsSync(tempDir)) {
                        await execAsync(`rm -rf "${tempDir}"`);
                    }
                } catch (cleanupError) {
                    console.error(`[Validation] Erro ao limpar diretório temporário:`, cleanupError);
                }
            }

            const valid = checks.fileExists && 
                         checks.fileSizeValid && 
                         checks.archiveValid && 
                         checks.sqlDumpValid &&
                         errors.length === 0;

            return { valid, checks, errors, warnings };
        } catch (error: any) {
            errors.push(`Erro durante validação: ${error.message}`);
            return { valid: false, checks, errors, warnings };
        }
    }
};
