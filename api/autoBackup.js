#!/usr/bin/env node

/**
 * Script de backup automático
 * 
 * Este script deve ser executado via cron para gerar backups diários.
 * 
 * Configuração do cron (executar às 03:00):
 * 0 3 * * * cd /var/www/ancdcampanha/fts/api && node autoBackup.js >> /var/log/ancdcampanha-backup.log 2>&1
 * 
 * Ou usando o caminho completo do node:
 * 0 3 * * * /usr/bin/node /var/www/ancdcampanha/fts/api/autoBackup.js >> /var/log/ancdcampanha-backup.log 2>&1
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const execAsync = promisify(exec);

// Configuração do banco de dados
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ftsancd',
};

// Diretório de backups
const BACKUP_DIR = '/var/backups/ancdcampanha';
const KEEP_COUNT = 7; // Manter últimos 7 backups automáticos

/**
 * Conecta ao banco de dados
 */
async function getDbConnection() {
    return await mysql.createConnection(dbConfig);
}

/**
 * Cria um registro de backup no banco
 */
async function createBackupRecord(type) {
    const connection = await getDbConnection();
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup-${type.toLowerCase()}-${timestamp}.tar.gz`;
        const filePath = path.join(BACKUP_DIR, fileName);

        // Garantir que o diretório existe
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const [result] = await connection.execute(
            `INSERT INTO backups (file_name, file_path, type, status, created_at) 
             VALUES (?, ?, ?, 'PROCESSING', NOW())`,
            [fileName, filePath, type]
        );

        return result.insertId;
    } finally {
        await connection.end();
    }
}

/**
 * Atualiza o status do backup
 */
async function updateBackupStatus(id, status, fileSize = null, errorMessage = null) {
    const connection = await getDbConnection();
    try {
        const updates = ['status = ?'];
        const values = [status];

        if (status === 'DONE' || status === 'FAILED') {
            updates.push('finished_at = NOW()');
        }

        if (fileSize !== null) {
            updates.push('file_size = ?');
            values.push(fileSize);
        }

        if (errorMessage) {
            updates.push('error_message = ?');
            values.push(errorMessage);
        }

        await connection.execute(
            `UPDATE backups SET ${updates.join(', ')} WHERE id = ?`,
            [...values, id]
        );
    } finally {
        await connection.end();
    }
}

/**
 * Gera dump do MySQL
 */
async function generateDatabaseDump(dumpPath) {
    // Se DB_HOST for 'mysql' (Docker), executar mysqldump dentro do container MySQL
    if (dbConfig.host === 'mysql') {
        const containerName = 'ftsancd_mysql';
        
        // Comando para executar mysqldump dentro do container MySQL
        const mysqldumpCmd = `docker exec ${containerName} mysqldump -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database}`;
        
        try {
            // Executar mysqldump e redirecionar output para arquivo
            const { stdout } = await execAsync(mysqldumpCmd);
            fs.writeFileSync(dumpPath, stdout);
        } catch (error) {
            // Tentar sem senha (pode estar em arquivo de configuração)
            try {
                const mysqldumpCmdNoPass = `docker exec ${containerName} mysqldump -u ${dbConfig.user} ${dbConfig.database}`;
                const { stdout } = await execAsync(mysqldumpCmdNoPass);
                fs.writeFileSync(dumpPath, stdout);
            } catch (error2) {
                // Se docker exec falhar, tentar verificar se o container existe
                try {
                    await execAsync(`docker ps --filter name=${containerName} --format "{{.Names}}"`);
                    throw new Error(`Falha ao gerar dump do banco: ${error2.message}`);
                } catch (dockerError) {
                    throw new Error(`Container MySQL não encontrado ou mysqldump falhou: ${error2.message}`);
                }
            }
        }
    } else {
        // Executar mysqldump localmente
        const host = dbConfig.host;
        
        // Verificar se mysqldump está disponível
        try {
            await execAsync('which mysqldump');
        } catch (error) {
            throw new Error('mysqldump não está instalado. Instale o mysql-client para continuar.');
        }
        
        const mysqldumpCmd = `mysqldump -h ${host} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} > ${dumpPath}`;

        try {
            await execAsync(mysqldumpCmd);
        } catch (error) {
            // Se falhar, tentar sem senha (pode estar em arquivo de configuração)
            const mysqldumpCmdNoPass = `mysqldump -h ${host} -u ${dbConfig.user} ${dbConfig.database} > ${dumpPath}`;
            try {
                await execAsync(mysqldumpCmdNoPass);
            } catch (error2) {
                throw new Error(`Falha ao gerar dump do banco: ${error2.message}`);
            }
        }
    }
}

/**
 * Obtém o caminho base dos assets
 */
function getAssetsPath() {
    const dockerPath = '/src/assets';
    const serverPath = '/var/www/ancdcampanha/fts/src/assets';
    const devPath = path.resolve(__dirname, '../src/assets');

    if (process.env.NODE_ENV === 'production' || fs.existsSync(dockerPath)) {
        return dockerPath;
    }

    if (fs.existsSync(serverPath)) {
        return serverPath;
    }

    return devPath;
}

/**
 * Aplica política de retenção
 */
async function applyRetentionPolicy() {
    const connection = await getDbConnection();
    try {
        const [results] = await connection.execute(
            `SELECT id FROM backups 
             WHERE type = 'AUTO' AND status = 'DONE' 
             ORDER BY created_at DESC`
        );

        if (results.length > KEEP_COUNT) {
            const backupsToDelete = results.slice(KEEP_COUNT);
            
            for (const backup of backupsToDelete) {
                console.log(`[Retention] Deletando backup antigo: ${backup.id}`);
                
                // Buscar informações do backup
                const [backupInfo] = await connection.execute(
                    'SELECT file_path FROM backups WHERE id = ?',
                    [backup.id]
                );

                if (backupInfo.length > 0 && fs.existsSync(backupInfo[0].file_path)) {
                    fs.unlinkSync(backupInfo[0].file_path);
                }

                // Deletar registro
                await connection.execute('DELETE FROM backups WHERE id = ?', [backup.id]);
            }

            console.log(`[Retention] Política aplicada: ${backupsToDelete.length} backups antigos deletados`);
        }
    } finally {
        await connection.end();
    }
}

/**
 * Função principal
 */
async function main() {
    console.log(`[${new Date().toISOString()}] Iniciando backup automático...`);

    let backupId = null;

    try {
        // 1. Criar registro de backup
        backupId = await createBackupRecord('AUTO');
        console.log(`[Backup ${backupId}] Registro criado`);

        // 2. Criar diretório temporário
        const tempDir = `/tmp/backup-${backupId}`;
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // 3. Gerar dump do banco
        const dumpPath = path.join(tempDir, 'database.sql');
        console.log(`[Backup ${backupId}] Gerando dump do banco de dados...`);
        await generateDatabaseDump(dumpPath);

        // 4. Copiar pasta de uploads
        const assetsPath = getAssetsPath();
        const uploadsPath = path.join(assetsPath, 'product');
        
        if (fs.existsSync(uploadsPath)) {
            console.log(`[Backup ${backupId}] Copiando pasta de uploads...`);
            const uploadsBackupPath = path.join(tempDir, 'uploads');
            await execAsync(`cp -r "${uploadsPath}" "${uploadsBackupPath}"`);
        }

        // 5. Copiar planilhas
        const spreadsheetsPath = path.join(assetsPath, 'spreadsheets');
        if (fs.existsSync(spreadsheetsPath)) {
            console.log(`[Backup ${backupId}] Copiando planilhas...`);
            const spreadsheetsBackupPath = path.join(tempDir, 'spreadsheets');
            await execAsync(`cp -r "${spreadsheetsPath}" "${spreadsheetsBackupPath}"`);
        }

        // 6. Criar arquivo de informações
        const infoPath = path.join(tempDir, 'backup-info.txt');
        const infoContent = `Backup gerado em: ${new Date().toISOString()}
Tipo: AUTO
ID: ${backupId}
`;
        fs.writeFileSync(infoPath, infoContent);

        // 7. Obter caminho do arquivo final
        const connection = await getDbConnection();
        const [backupInfo] = await connection.execute(
            'SELECT file_path FROM backups WHERE id = ?',
            [backupId]
        );
        await connection.end();

        if (backupInfo.length === 0) {
            throw new Error('Registro de backup não encontrado');
        }

        const finalPath = backupInfo[0].file_path;

        // 8. Comprimir
        console.log(`[Backup ${backupId}] Comprimindo arquivos...`);
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        await execAsync(`cd "${tempDir}" && tar -czf "${finalPath}" .`);

        // 9. Obter tamanho
        const stats = fs.statSync(finalPath);
        const fileSize = stats.size;

        // 10. Atualizar status
        await updateBackupStatus(backupId, 'DONE', fileSize);

        // 11. Limpar diretório temporário
        await execAsync(`rm -rf "${tempDir}"`);

        console.log(`[Backup ${backupId}] Backup concluído com sucesso! Tamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        // 12. Aplicar política de retenção
        console.log(`[Backup ${backupId}] Aplicando política de retenção...`);
        await applyRetentionPolicy();

        console.log(`[${new Date().toISOString()}] Backup automático concluído com sucesso!`);
        process.exit(0);
    } catch (error) {
        console.error(`[Backup ${backupId || '?'}] Erro ao criar backup:`, error);
        
        if (backupId) {
            await updateBackupStatus(
                backupId,
                'FAILED',
                null,
                error.message || 'Erro desconhecido'
            );
        }

        // Limpar diretório temporário
        try {
            const tempDir = `/tmp/backup-${backupId}`;
            if (fs.existsSync(tempDir)) {
                await execAsync(`rm -rf "${tempDir}"`);
            }
        } catch (cleanupError) {
            console.error(`[Backup ${backupId}] Erro ao limpar diretório temporário:`, cleanupError);
        }

        console.error(`[${new Date().toISOString()}] Backup automático falhou!`);
        process.exit(1);
    }
}

// Executar
main();
