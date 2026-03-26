import { query } from '../config/db';
import { AgencyPointsImport, AgencyPointsImportItem, CreateAgencyPointsImportDto } from '../types';
import { processSpreadsheet, ProcessedRow } from './spreadsheetProcessorService';
import crypto from 'crypto';
import fs from 'fs';
import { importLogger } from '../utils/importLogger';

export const agencyPointsImportService = {
    async create(data: CreateAgencyPointsImportDto, uploadedBy: number): Promise<number> {
        // Verificar se checksum já existe (prevenir duplicatas)
        const existing = await query(
            'SELECT id FROM agency_points_imports WHERE checksum = ?',
            [data.checksum]
        ) as any[];

        if (Array.isArray(existing) && existing.length > 0) {
            throw new Error('Import with this checksum already exists');
        }

        // Criar import
        const result = await query(
            'INSERT INTO agency_points_imports (reference_period, uploaded_by, uploaded_at, checksum) VALUES (?, ?, NOW(), ?)',
            [data.referencePeriod, uploadedBy, data.checksum]
        ) as any;

        const importId = result.insertId;

        // Criar items (não criar ledger entries ainda)
        // Regra: Não sobrescrever registros existentes baseado em saleId + company
        for (const item of data.items) {
            // Verificar se já existe registro com mesmo saleId + company (se ambos estiverem presentes)
            if (item.saleId && item.company) {
                const existing = await query(
                    'SELECT id FROM agency_points_import_items WHERE sale_id = ? AND company = ?',
                    [item.saleId, item.company]
                ) as any[];

                if (Array.isArray(existing) && existing.length > 0) {
                    // Pular este item - não sobrescrever (append-only)
                    console.warn(`Skipping duplicate item: saleId=${item.saleId}, company=${item.company}`);
                    continue;
                }
            }

            await query(
                `INSERT INTO agency_points_import_items 
                (import_id, sale_id, sale_date, cnpj, agency_name, branch, store, executive_name, supplier, product_name, company, points) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    importId,
                    item.saleId || null,
                    item.saleDate ? new Date(item.saleDate) : null,
                    item.cnpj,
                    item.agencyName || null,
                    item.branch || null,
                    item.store || null,
                    item.executiveName,
                    item.supplier || null,
                    item.productName || null,
                    item.company || null,
                    item.points
                ]
            );
        }

        return importId;
    },

    async findById(id: number): Promise<AgencyPointsImport | null> {
        const results = await query(
            `SELECT 
                id, 
                reference_period as referencePeriod, 
                uploaded_by as uploadedBy, 
                uploaded_at as uploadedAt, 
                checksum,
                status,
                total_rows as totalRows,
                processed_rows as processedRows,
                started_at as startedAt,
                finished_at as finishedAt,
                error_message as errorMessage
            FROM agency_points_imports WHERE id = ?`,
            [id]
        ) as AgencyPointsImport[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findAll(): Promise<AgencyPointsImport[]> {
        const results = await query(
            `SELECT 
                id, 
                reference_period as referencePeriod, 
                uploaded_by as uploadedBy, 
                uploaded_at as uploadedAt, 
                checksum,
                status,
                total_rows as totalRows,
                processed_rows as processedRows,
                started_at as startedAt,
                finished_at as finishedAt,
                error_message as errorMessage
            FROM agency_points_imports ORDER BY uploaded_at DESC`
        ) as AgencyPointsImport[];

        return Array.isArray(results) ? results : [];
    },

    /**
     * Verifica se há alguma importação em processamento
     */
    async hasProcessingImport(): Promise<boolean> {
        const results = await query(
            'SELECT id FROM agency_points_imports WHERE status = ?',
            ['PROCESSING']
        ) as any[];

        return Array.isArray(results) && results.length > 0;
    },

    /**
     * Obtém o status e progresso de uma importação
     */
    async getStatus(importId: number): Promise<{
        status: string;
        totalRows: number;
        processedRows: number;
        progress: number;
    } | null> {
        const importData = await this.findById(importId);
        if (!importData) {
            return null;
        }

        const totalRows = importData.totalRows || 0;
        const processedRows = importData.processedRows || 0;
        const progress = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0;

        return {
            status: importData.status || 'PENDING',
            totalRows,
            processedRows,
            progress
        };
    },

    async findItemsByImportId(importId: number): Promise<AgencyPointsImportItem[]> {
        const results = await query(
            `SELECT 
                id, 
                import_id as importId, 
                sale_id as saleId,
                sale_date as saleDate,
                cnpj, 
                agency_name as agencyName,
                branch,
                store,
                executive_name as executiveName,
                supplier,
                product_name as productName,
                company,
                points 
            FROM agency_points_import_items 
            WHERE import_id = ?`,
            [importId]
        ) as AgencyPointsImportItem[];

        return Array.isArray(results) ? results : [];
    },

    async findItemsByCnpj(cnpj: string): Promise<AgencyPointsImportItem[]> {
        const results = await query(
            `SELECT 
                id, 
                import_id as importId, 
                sale_id as saleId,
                sale_date as saleDate,
                cnpj, 
                agency_name as agencyName,
                branch,
                store,
                executive_name as executiveName,
                supplier,
                product_name as productName,
                company,
                points 
            FROM agency_points_import_items 
            WHERE cnpj = ?`,
            [cnpj]
        ) as AgencyPointsImportItem[];

        return Array.isArray(results) ? results : [];
    },

    /**
     * Cria importação e inicia processamento em background
     * Retorna imediatamente com importId
     */
    async createFromSpreadsheet(
        filePath: string,
        referencePeriod: string,
        uploadedBy: number
    ): Promise<number> {
        console.log(`📊 Criando importação de planilha: ${filePath}`);
        console.log(`📅 Período de referência: ${referencePeriod}`);
        console.log(`👤 Uploaded by: ${uploadedBy}`);

        // Calcular checksum do arquivo
        const fileBuffer = fs.readFileSync(filePath);
        const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

        // Verificar se checksum já existe
        const existing = await query(
            'SELECT id FROM agency_points_imports WHERE checksum = ?',
            [checksum]
        ) as any[];

        if (Array.isArray(existing) && existing.length > 0) {
            throw new Error('Arquivo já foi importado anteriormente (mesmo checksum)');
        }

        // Criar import com status PENDING
        const result = await query(
            'INSERT INTO agency_points_imports (reference_period, uploaded_by, uploaded_at, checksum, status) VALUES (?, ?, NOW(), ?, ?)',
            [referencePeriod, uploadedBy, checksum, 'PENDING']
        ) as any;

        const importId = result.insertId;

        // Iniciar processamento em background (não aguardar)
        this.processImportInBackground(importId, filePath).catch((error) => {
            importLogger.logError(
                importId,
                'Erro fatal no processamento em background',
                error instanceof Error ? error : new Error(String(error)),
                { filePath, referencePeriod }
            );
        });

        return importId;
    },

    /**
     * Processa importação em background (assíncrono)
     */
    async processImportInBackground(importId: number, filePath: string): Promise<void> {
        try {
            importLogger.logInfo(importId, 'Iniciando processamento em background', { filePath });

            // Atualizar status para PROCESSING
            await query(
                'UPDATE agency_points_imports SET status = ?, started_at = NOW() WHERE id = ?',
                ['PROCESSING', importId]
            );

            // Processar planilha
            let processResult;
            try {
                processResult = await processSpreadsheet(filePath);
                importLogger.logInfo(
                    importId,
                    `Planilha processada: ${processResult.validRows} linhas válidas, ${processResult.errorRows} com erro`,
                    { totalRows: processResult.totalRows, validRows: processResult.validRows, errorRows: processResult.errorRows }
                );
            } catch (error) {
                importLogger.logError(
                    importId,
                    'Erro ao processar planilha',
                    error instanceof Error ? error : new Error(String(error)),
                    { filePath }
                );
                throw error;
            }

            // Atualizar total_rows
            await query(
                'UPDATE agency_points_imports SET total_rows = ? WHERE id = ?',
                [processResult.totalRows, importId]
            );

            // Processar linhas válidas
            let inserted = 0;
            let skipped = 0;
            const errors: Array<{ rowNumber: number; reason: string }> = [];
            const updateInterval = 10; // Atualizar progresso a cada 10 linhas

            for (let i = 0; i < processResult.rows.length; i++) {
                const row = processResult.rows[i];

                // Linhas com erro já estão no processResult
                if (row.error) {
                    errors.push({
                        rowNumber: row.rowNumber,
                        reason: row.error
                    });
                    
                    // Log detalhado do registro pulado
                    importLogger.logWarning(
                        importId,
                        `Linha ${row.rowNumber}: Registro pulado - ${row.error}`,
                        {
                            rowNumber: row.rowNumber,
                            reason: 'Erro de validação',
                            error: row.error,
                            rowData: row.data ? {
                                cnpj: row.data.cnpj,
                                saleId: row.data.saleId,
                                saleDate: row.data.saleDate,
                                agencyName: row.data.agencyName,
                                executiveName: row.data.executiveName,
                                points: row.data.points,
                                company: row.data.company
                            } : null
                        }
                    );
                    
                    importLogger.logRowError(importId, row.rowNumber, row.error, row.data);
                    
                    // Logs específicos para promotor ausente ou pontos inválidos
                    if (row.error.includes('Promotor') || row.error.includes('promotor')) {
                        importLogger.logWarning(
                            importId,
                            `Linha ${row.rowNumber}: Promotor ausente ou vazio (linha rejeitada)`,
                            { 
                                rowNumber: row.rowNumber, 
                                error: row.error,
                                cnpj: row.data?.cnpj,
                                saleId: row.data?.saleId,
                                points: row.data?.points
                            }
                        );
                    }
                    
                    if (row.error.includes('Pontos') || row.error.includes('pontos') || row.error.includes('pontuação')) {
                        importLogger.logWarning(
                            importId,
                            `Linha ${row.rowNumber}: Pontos inválidos ou ausentes (linha rejeitada)`,
                            { 
                                rowNumber: row.rowNumber, 
                                error: row.error,
                                cnpj: row.data?.cnpj,
                                saleId: row.data?.saleId,
                                executiveName: row.data?.executiveName,
                                points: row.data?.points
                            },
                            'PONTUACAO'
                        );
                    }
                    
                    continue;
                }

                // Linhas sem dados também são erro
                if (!row.data) {
                    const reason = 'Dados inválidos - linha sem dados';
                    errors.push({
                        rowNumber: row.rowNumber,
                        reason
                    });
                    
                    // Log do registro pulado
                    importLogger.logWarning(
                        importId,
                        `Linha ${row.rowNumber}: Registro pulado - ${reason}`,
                        {
                            rowNumber: row.rowNumber,
                            reason: 'Dados inválidos',
                            error: 'Linha sem dados válidos'
                        }
                    );
                    
                    importLogger.logRowError(importId, row.rowNumber, reason);
                    continue;
                }

                // Verificar se promotor está ausente ou vazio
                if (!row.data.executiveName || row.data.executiveName.trim() === '') {
                    importLogger.logWarning(
                        importId,
                        `Linha ${row.rowNumber}: Promotor ausente ou vazio`,
                        { rowNumber: row.rowNumber, cnpj: row.data.cnpj, saleId: row.data.saleId }
                    );
                }

                // Verificar se pontuação é 0 ou null
                if (row.data.points === null || row.data.points === undefined || row.data.points === 0) {
                    importLogger.logWarning(
                        importId,
                        `Linha ${row.rowNumber}: Pontuação é 0 ou null`,
                        { 
                            rowNumber: row.rowNumber, 
                            points: row.data.points,
                            cnpj: row.data.cnpj, 
                            saleId: row.data.saleId,
                            executiveName: row.data.executiveName
                        },
                        'PONTUACAO'
                    );
                }

                // Verificar duplicata (saleId + company)
                if (row.data.saleId && row.data.company) {
                    const existing = await query(
                        'SELECT id FROM agency_points_import_items WHERE sale_id = ? AND company = ?',
                        [row.data.saleId, row.data.company]
                    ) as any[];

                    if (Array.isArray(existing) && existing.length > 0) {
                        skipped++;
                        const reason = `Duplicata: saleId=${row.data.saleId}, company=${row.data.company}`;
                        errors.push({
                            rowNumber: row.rowNumber,
                            reason
                        });
                        
                        // Log do registro pulado
                        importLogger.logWarning(
                            importId,
                            `Linha ${row.rowNumber}: Registro pulado - ${reason}`,
                            {
                                rowNumber: row.rowNumber,
                                reason: 'Duplicata',
                                saleId: row.data.saleId,
                                company: row.data.company,
                                cnpj: row.data.cnpj,
                                agencyName: row.data.agencyName,
                                points: row.data.points,
                                existingRecordId: existing[0]?.id
                            },
                            'DUPLICATA'
                        );
                        
                        // Atualizar progresso mesmo para linhas puladas
                        if ((i + 1) % updateInterval === 0) {
                            await query(
                                'UPDATE agency_points_imports SET processed_rows = ? WHERE id = ?',
                                [i + 1, importId]
                            );
                        }
                        continue;
                    }
                }

                // Inserir item
                try {
                    // Preparar data para inserção no MySQL
                    // normalizeDate já retorna string 'YYYY-MM-DD', que é o formato esperado pelo MySQL DATE
                    let saleDateForDb: string | null = null;
                    
                    // Verificar se saleDate existe e não é null/undefined
                    if (row.data.saleDate !== null && row.data.saleDate !== undefined) {
                        // normalizeDate já retorna 'YYYY-MM-DD', usar diretamente
                        const saleDateValue: any = row.data.saleDate;
                        if (typeof saleDateValue === 'string') {
                            // Verificar se está no formato correto
                            if (/^\d{4}-\d{2}-\d{2}$/.test(saleDateValue)) {
                                saleDateForDb = saleDateValue;
                            } else if (saleDateValue.trim() !== '' && saleDateValue.toLowerCase() !== 'null') {
                                // Tentar converter se não estiver no formato esperado
                                const dateObj = new Date(saleDateValue);
                                if (!isNaN(dateObj.getTime())) {
                                    saleDateForDb = dateObj.toISOString().split('T')[0];
                                } else {
                                    console.warn(`⚠️  Linha ${row.rowNumber}: Não foi possível converter saleDate="${saleDateValue}"`);
                                }
                            }
                        } else if (saleDateValue instanceof Date) {
                            // Se for objeto Date, converter para string
                            if (!isNaN(saleDateValue.getTime())) {
                                saleDateForDb = saleDateValue.toISOString().split('T')[0];
                            }
                        } else if (typeof saleDateValue === 'number') {
                            // Se for número (Excel serial date), converter
                            try {
                                const excelEpoch = new Date(1900, 0, 1);
                                const date = new Date(excelEpoch.getTime() + (saleDateValue - 2) * 24 * 60 * 60 * 1000);
                                if (!isNaN(date.getTime())) {
                                    saleDateForDb = date.toISOString().split('T')[0];
                                }
                            } catch (error) {
                                console.warn(`⚠️  Linha ${row.rowNumber}: Erro ao converter número para data: ${saleDateValue}`);
                            }
                        }
                    }
                    
                    // Log quando saleDate é null/undefined ou não foi processado (apenas primeiras 5 linhas)
                    if (inserted < 5 && saleDateForDb === null) {
                        console.log(`⚠️  Linha ${row.rowNumber}: saleDate não processado. Valor:`, {
                            saleDate: row.data.saleDate,
                            tipo: typeof row.data.saleDate,
                            saleId: row.data.saleId,
                            cnpj: row.data.cnpj
                        });
                    }
                    
                    // Log de debug para data antes de inserir (apenas primeiras 10 linhas)
                    if (inserted < 10) {
                        console.log(`📅 Inserindo linha ${row.rowNumber}: saleDate="${row.data.saleDate}", saleDateForDb="${saleDateForDb}", tipo=${typeof row.data.saleDate}`);
                    }
                    
                    const insertParams = [
                        importId,
                        row.data.saleId || null,
                        saleDateForDb,
                        row.data.cnpj,
                        row.data.agencyName || null,
                        row.data.branch || null,
                        row.data.store || null,
                        row.data.executiveName,
                        row.data.supplier || null,
                        row.data.productName || null,
                        row.data.company || null,
                        row.data.points
                    ];
                    
                    // Log completo dos valores sendo inseridos (apenas primeiras 3 linhas)
                    if (inserted < 3) {
                        console.log(`📝 Valores INSERT linha ${row.rowNumber}:`, {
                            importId,
                            saleId: row.data.saleId || null,
                            saleDate: saleDateForDb,
                            cnpj: row.data.cnpj,
                            points: row.data.points,
                            insertParams: insertParams.map((p, i) => {
                                const fields = ['importId', 'saleId', 'saleDate', 'cnpj', 'agencyName', 'branch', 'store', 'executiveName', 'supplier', 'productName', 'company', 'points'];
                                return `${fields[i]}=${p}`;
                            }).join(', ')
                        });
                    }
                    
                    await query(
                        `INSERT INTO agency_points_import_items 
                        (import_id, sale_id, sale_date, cnpj, agency_name, branch, store, executive_name, supplier, product_name, company, points) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        insertParams
                    );
                    inserted++;
                } catch (error) {
                    // Erro ao inserir (ex: constraint violation)
                    skipped++;
                    const errorMessage = error instanceof Error ? error.message : 'Erro ao inserir no banco de dados';
                    errors.push({
                        rowNumber: row.rowNumber,
                        reason: errorMessage
                    });
                    
                    // Log do registro pulado por erro de inserção
                    importLogger.logError(
                        importId,
                        `Linha ${row.rowNumber}: Registro pulado - Erro ao inserir no banco de dados`,
                        error instanceof Error ? error : new Error(errorMessage),
                        {
                            rowNumber: row.rowNumber,
                            reason: 'Erro de inserção',
                            errorMessage,
                            rowData: {
                                saleId: row.data.saleId,
                                saleDate: row.data.saleDate,
                                cnpj: row.data.cnpj,
                                agencyName: row.data.agencyName,
                                executiveName: row.data.executiveName,
                                points: row.data.points,
                                company: row.data.company
                            }
                        }
                    );
                    
                    importLogger.logRowError(
                        importId,
                        row.rowNumber,
                        `Erro ao inserir no banco: ${errorMessage}`,
                        row.data
                    );
                }

                // Atualizar progresso periodicamente
                if ((i + 1) % updateInterval === 0 || i === processResult.rows.length - 1) {
                    await query(
                        'UPDATE agency_points_imports SET processed_rows = ? WHERE id = ?',
                        [i + 1, importId]
                    );
                }
            }

            // Sincronizar import items com ledger para agências já existentes
            // Isso garante que quando uma planilha é importada, os pontos sejam computados
            // para agências que já estavam cadastradas
            try {
                importLogger.logInfo(importId, 'Sincronizando import items com ledger para agências existentes', {});
                
                // Buscar todos os CNPJs únicos dos import items desta importação
                const cnpjResults = await query(
                    `SELECT DISTINCT REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') as normalized_cnpj
                     FROM agency_points_import_items 
                     WHERE import_id = ?`,
                    [importId]
                ) as any[];

                if (Array.isArray(cnpjResults) && cnpjResults.length > 0) {
                    let syncedCount = 0;
                    
                    for (const cnpjRow of cnpjResults) {
                        const normalizedCnpj = cnpjRow.normalized_cnpj;
                        
                        // Buscar agência com este CNPJ
                        const agencyResults = await query(
                            `SELECT id FROM agencies 
                             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
                            [normalizedCnpj]
                        ) as any[];

                        if (Array.isArray(agencyResults) && agencyResults.length > 0) {
                            const agencyId = agencyResults[0].id;
                            
                            // Buscar dados da agência atual
                            const agencyDataResults = await query(
                                `SELECT id, branch, executive_name FROM agencies WHERE id = ?`,
                                [agencyId]
                            ) as any[];
                            
                            const agencyData = Array.isArray(agencyDataResults) && agencyDataResults.length > 0 
                                ? agencyDataResults[0] 
                                : null;
                            
                            const currentBranch = agencyData?.branch || null;
                            const currentExecutiveName = agencyData?.executive_name || null;
                            
                            // Buscar branch e executive_name mais comuns dos import items desta importação para este CNPJ
                            // Usar apenas desta importação para garantir que estamos sincronizando com os dados mais recentes
                            const branchResults = await query(
                                `SELECT branch, COUNT(*) as count 
                                 FROM agency_points_import_items 
                                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
                                 AND import_id = ?
                                 AND branch IS NOT NULL AND branch != ''
                                 GROUP BY branch
                                 ORDER BY count DESC
                                 LIMIT 1`,
                                [normalizedCnpj, importId]
                            ) as any[];

                            const newBranch = Array.isArray(branchResults) && branchResults.length > 0 
                                ? branchResults[0].branch 
                                : null;

                            const executiveResults = await query(
                                `SELECT executive_name, COUNT(*) as count 
                                 FROM agency_points_import_items 
                                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
                                 AND import_id = ?
                                 AND executive_name IS NOT NULL AND executive_name != ''
                                 GROUP BY executive_name
                                 ORDER BY count DESC
                                 LIMIT 1`,
                                [normalizedCnpj, importId]
                            ) as any[];

                            const newExecutiveName = Array.isArray(executiveResults) && executiveResults.length > 0 
                                ? executiveResults[0].executive_name 
                                : null;

                            // Atualizar branch e executive_name se estiverem faltando ou se houver novos dados
                            const updates: string[] = [];
                            const updateValues: any[] = [];

                            if (!currentBranch && newBranch) {
                                updates.push('branch = ?');
                                updateValues.push(newBranch);
                            }

                            if (!currentExecutiveName && newExecutiveName) {
                                updates.push('executive_name = ?');
                                updateValues.push(newExecutiveName);
                            }

                            if (updates.length > 0) {
                                updateValues.push(agencyId);
                                await query(
                                    `UPDATE agencies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
                                    updateValues
                                );
                                
                                importLogger.logInfo(
                                    importId,
                                    `Agência ${agencyId} atualizada com dados da planilha`,
                                    { 
                                        agencyId, 
                                        branchUpdated: !currentBranch && newBranch ? newBranch : null,
                                        executiveUpdated: !currentExecutiveName && newExecutiveName ? newExecutiveName : null
                                    }
                                );
                            }
                            
                            // Calcular total de pontos desta importação para este CNPJ
                            const totalPointsResult = await query(
                                `SELECT COALESCE(SUM(points), 0) as totalPoints
                                 FROM agency_points_import_items api
                                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(api.cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
                                 AND api.import_id = ?`,
                                [normalizedCnpj, importId]
                            ) as any[];

                            const totalPoints = Array.isArray(totalPointsResult) && totalPointsResult.length > 0
                                ? Number(totalPointsResult[0].totalPoints) || 0
                                : 0;

                            if (totalPoints > 0) {
                                // Verificar quanto já foi lançado no ledger para este agency+import
                                const existingLedgerResult = await query(
                                    `SELECT COALESCE(SUM(points), 0) as currentPoints
                                     FROM agency_points_ledger
                                     WHERE agency_id = ?
                                     AND source_type = 'IMPORT'
                                     AND source_id = ?`,
                                    [agencyId, importId]
                                ) as any[];

                                const currentPoints = Array.isArray(existingLedgerResult) && existingLedgerResult.length > 0
                                    ? Number(existingLedgerResult[0].currentPoints) || 0
                                    : 0;

                                // Se já lançamos tudo, não fazer nada (idempotente)
                                if (currentPoints < totalPoints) {
                                    const diff = totalPoints - currentPoints;

                                    await query(
                                        'INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                                        [
                                            agencyId,
                                            'IMPORT',
                                            importId,
                                            diff,
                                            `Points import from import ${importId}`
                                        ]
                                    );
                                    syncedCount++;
                                }
                            }
                        }
                    }
                    
                    if (syncedCount > 0) {
                        importLogger.logInfo(
                            importId,
                            `Sincronização concluída: ${syncedCount} entradas criadas no ledger para agências existentes`,
                            { syncedCount }
                        );
                    }
                }
            } catch (syncError) {
                // Log erro mas não falha a importação
                importLogger.logError(
                    importId,
                    'Erro ao sincronizar import items com ledger',
                    syncError instanceof Error ? syncError : new Error(String(syncError)),
                    {}
                );
            }

            // Finalizar com sucesso
            await query(
                'UPDATE agency_points_imports SET status = ?, processed_rows = ?, finished_at = NOW() WHERE id = ?',
                ['DONE', processResult.rows.length, importId]
            );

            // Resumo final dos registros pulados
            const skippedByReason = errors.reduce((acc, err) => {
                const reason = err.reason || 'Motivo desconhecido';
                if (!acc[reason]) {
                    acc[reason] = 0;
                }
                acc[reason]++;
                return acc;
            }, {} as Record<string, number>);

            importLogger.logInfo(
                importId,
                `Importação concluída: ${inserted} inseridos, ${skipped} pulados, ${errors.length} erros`,
                { 
                    inserted, 
                    skipped, 
                    totalErrors: errors.length,
                    skippedByReason,
                    totalRows: processResult.rows.length
                }
            );

            // Log detalhado do resumo de registros pulados
            if (skipped > 0) {
                importLogger.logWarning(
                    importId,
                    `Resumo de registros pulados (${skipped} total):`,
                    {
                        totalSkipped: skipped,
                        breakdown: skippedByReason,
                        sampleErrors: errors.slice(0, 10) // Primeiros 10 erros como exemplo
                    }
                );
            }

        } catch (error) {
            // Finalizar com erro
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            await query(
                'UPDATE agency_points_imports SET status = ?, error_message = ?, finished_at = NOW() WHERE id = ?',
                ['FAILED', errorMessage.substring(0, 1000), importId] // Limitar tamanho da mensagem
            );
            
            importLogger.logError(
                importId,
                'Erro fatal ao processar importação',
                error instanceof Error ? error : new Error(String(error)),
                { filePath, errorMessage }
            );
            
            throw error;
        } finally {
            // Remover arquivo após processamento
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️  Arquivo temporário removido: ${filePath}`);
                } catch (unlinkError) {
                    console.warn('Erro ao remover arquivo temporário:', unlinkError);
                }
            }
        }
    },

    /**
     * Deleta uma importação e todos os seus itens
     * IMPORTANTE: Não afeta o ledger, apenas remove os registros de importação
     */
    async delete(importId: number): Promise<void> {
        // Verificar se import existe
        const importData = await this.findById(importId);
        if (!importData) {
            throw new Error('Import not found');
        }

        // Deletar todos os itens da importação primeiro (foreign key constraint)
        await query(
            'DELETE FROM agency_points_import_items WHERE import_id = ?',
            [importId]
        );

        // Deletar a importação
        await query(
            'DELETE FROM agency_points_imports WHERE id = ?',
            [importId]
        );
    }
    ,
    /**
     * Re-sincroniza uma importação específica com o ledger.
     * Útil para corrigir importações antigas sem duplicar pontos já lançados.
     */
    async resyncWithLedger(importId: number): Promise<{ syncedAgencies: number }> {
        // Buscar CNPJs únicos desta importação
        const cnpjResults = await query(
            `SELECT DISTINCT REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') as normalized_cnpj
             FROM agency_points_import_items 
             WHERE import_id = ?`,
            [importId]
        ) as any[];

        if (!Array.isArray(cnpjResults) || cnpjResults.length === 0) {
            return { syncedAgencies: 0 };
        }

        let syncedCount = 0;

        for (const cnpjRow of cnpjResults) {
            const normalizedCnpj = cnpjRow.normalized_cnpj;

            // Buscar agência ativa com este CNPJ
            const agencyResults = await query(
                `SELECT id FROM agencies 
                 WHERE active = true
                 AND REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
                [normalizedCnpj]
            ) as any[];

            if (!Array.isArray(agencyResults) || agencyResults.length === 0) {
                continue;
            }

            const agencyId = agencyResults[0].id;

            // Calcular total de pontos desta importação para este CNPJ
            const totalPointsResult = await query(
                `SELECT COALESCE(SUM(points), 0) as totalPoints
                 FROM agency_points_import_items api
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(api.cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
                 AND api.import_id = ?`,
                [normalizedCnpj, importId]
            ) as any[];

            const totalPoints = Array.isArray(totalPointsResult) && totalPointsResult.length > 0
                ? Number(totalPointsResult[0].totalPoints) || 0
                : 0;

            if (totalPoints <= 0) {
                continue;
            }

            // Verificar quanto já foi lançado no ledger para este agency+import (apenas IMPORT)
            const existingLedgerResult = await query(
                `SELECT COALESCE(SUM(points), 0) as currentPoints
                 FROM agency_points_ledger
                 WHERE agency_id = ?
                 AND source_type = 'IMPORT'
                 AND source_id = ?`,
                [agencyId, importId]
            ) as any[];

            const currentPoints = Array.isArray(existingLedgerResult) && existingLedgerResult.length > 0
                ? Number(existingLedgerResult[0].currentPoints) || 0
                : 0;

            // Se já lançamos tudo, não fazer nada (idempotente)
            if (currentPoints >= totalPoints) {
                continue;
            }

            const diff = totalPoints - currentPoints;

            await query(
                'INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [
                    agencyId,
                    'IMPORT',
                    importId,
                    diff,
                    `Resync points import from import ${importId}`
                ]
            );

            syncedCount++;
        }

        return { syncedAgencies: syncedCount };
    }
};
