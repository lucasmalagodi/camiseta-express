"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agencyPointsImportService = void 0;
const db_1 = require("../config/db");
const spreadsheetProcessorService_1 = require("./spreadsheetProcessorService");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const importLogger_1 = require("../utils/importLogger");
exports.agencyPointsImportService = {
    async create(data, uploadedBy) {
        // Verificar se checksum já existe (prevenir duplicatas)
        const existing = await (0, db_1.query)('SELECT id FROM agency_points_imports WHERE checksum = ?', [data.checksum]);
        if (Array.isArray(existing) && existing.length > 0) {
            throw new Error('Import with this checksum already exists');
        }
        // Criar import
        const result = await (0, db_1.query)('INSERT INTO agency_points_imports (reference_period, uploaded_by, uploaded_at, checksum) VALUES (?, ?, NOW(), ?)', [data.referencePeriod, uploadedBy, data.checksum]);
        const importId = result.insertId;
        // Criar items (não criar ledger entries ainda)
        // Regra: Não sobrescrever registros existentes baseado em saleId + company
        for (const item of data.items) {
            // Verificar se já existe registro com mesmo saleId + company (se ambos estiverem presentes)
            if (item.saleId && item.company) {
                const existing = await (0, db_1.query)('SELECT id FROM agency_points_import_items WHERE sale_id = ? AND company = ?', [item.saleId, item.company]);
                if (Array.isArray(existing) && existing.length > 0) {
                    // Pular este item - não sobrescrever (append-only)
                    console.warn(`Skipping duplicate item: saleId=${item.saleId}, company=${item.company}`);
                    continue;
                }
            }
            await (0, db_1.query)(`INSERT INTO agency_points_import_items 
                (import_id, sale_id, sale_date, cnpj, agency_name, branch, store, executive_name, supplier, product_name, company, points) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
        }
        return importId;
    },
    async findById(id) {
        const results = await (0, db_1.query)(`SELECT 
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
            FROM agency_points_imports WHERE id = ?`, [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findAll() {
        const results = await (0, db_1.query)(`SELECT 
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
            FROM agency_points_imports ORDER BY uploaded_at DESC`);
        return Array.isArray(results) ? results : [];
    },
    /**
     * Verifica se há alguma importação em processamento
     */
    async hasProcessingImport() {
        const results = await (0, db_1.query)('SELECT id FROM agency_points_imports WHERE status = ?', ['PROCESSING']);
        return Array.isArray(results) && results.length > 0;
    },
    /**
     * Obtém o status e progresso de uma importação
     */
    async getStatus(importId) {
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
    async findItemsByImportId(importId) {
        const results = await (0, db_1.query)(`SELECT 
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
            WHERE import_id = ?`, [importId]);
        return Array.isArray(results) ? results : [];
    },
    async findItemsByCnpj(cnpj) {
        const results = await (0, db_1.query)(`SELECT 
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
            WHERE cnpj = ?`, [cnpj]);
        return Array.isArray(results) ? results : [];
    },
    /**
     * Cria importação e inicia processamento em background
     * Retorna imediatamente com importId
     */
    async createFromSpreadsheet(filePath, referencePeriod, uploadedBy) {
        console.log(`📊 Criando importação de planilha: ${filePath}`);
        console.log(`📅 Período de referência: ${referencePeriod}`);
        console.log(`👤 Uploaded by: ${uploadedBy}`);
        // Calcular checksum do arquivo
        const fileBuffer = fs_1.default.readFileSync(filePath);
        const checksum = crypto_1.default.createHash('md5').update(fileBuffer).digest('hex');
        // Verificar se checksum já existe
        const existing = await (0, db_1.query)('SELECT id FROM agency_points_imports WHERE checksum = ?', [checksum]);
        if (Array.isArray(existing) && existing.length > 0) {
            throw new Error('Arquivo já foi importado anteriormente (mesmo checksum)');
        }
        // Criar import com status PENDING
        const result = await (0, db_1.query)('INSERT INTO agency_points_imports (reference_period, uploaded_by, uploaded_at, checksum, status) VALUES (?, ?, NOW(), ?, ?)', [referencePeriod, uploadedBy, checksum, 'PENDING']);
        const importId = result.insertId;
        // Iniciar processamento em background (não aguardar)
        this.processImportInBackground(importId, filePath).catch((error) => {
            importLogger_1.importLogger.logError(importId, 'Erro fatal no processamento em background', error instanceof Error ? error : new Error(String(error)), { filePath, referencePeriod });
        });
        return importId;
    },
    /**
     * Processa importação em background (assíncrono)
     */
    async processImportInBackground(importId, filePath) {
        try {
            importLogger_1.importLogger.logInfo(importId, 'Iniciando processamento em background', { filePath });
            // Atualizar status para PROCESSING
            await (0, db_1.query)('UPDATE agency_points_imports SET status = ?, started_at = NOW() WHERE id = ?', ['PROCESSING', importId]);
            // Processar planilha
            let processResult;
            try {
                processResult = await (0, spreadsheetProcessorService_1.processSpreadsheet)(filePath);
                importLogger_1.importLogger.logInfo(importId, `Planilha processada: ${processResult.validRows} linhas válidas, ${processResult.errorRows} com erro`, { totalRows: processResult.totalRows, validRows: processResult.validRows, errorRows: processResult.errorRows });
            }
            catch (error) {
                importLogger_1.importLogger.logError(importId, 'Erro ao processar planilha', error instanceof Error ? error : new Error(String(error)), { filePath });
                throw error;
            }
            // Atualizar total_rows
            await (0, db_1.query)('UPDATE agency_points_imports SET total_rows = ? WHERE id = ?', [processResult.totalRows, importId]);
            // Processar linhas válidas
            let inserted = 0;
            let skipped = 0;
            const errors = [];
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
                    importLogger_1.importLogger.logWarning(importId, `Linha ${row.rowNumber}: Registro pulado - ${row.error}`, {
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
                    });
                    importLogger_1.importLogger.logRowError(importId, row.rowNumber, row.error, row.data);
                    // Logs específicos para promotor ausente ou pontos inválidos
                    if (row.error.includes('Promotor') || row.error.includes('promotor')) {
                        importLogger_1.importLogger.logWarning(importId, `Linha ${row.rowNumber}: Promotor ausente ou vazio (linha rejeitada)`, {
                            rowNumber: row.rowNumber,
                            error: row.error,
                            cnpj: row.data?.cnpj,
                            saleId: row.data?.saleId,
                            points: row.data?.points
                        });
                    }
                    if (row.error.includes('Pontos') || row.error.includes('pontos') || row.error.includes('pontuação')) {
                        importLogger_1.importLogger.logWarning(importId, `Linha ${row.rowNumber}: Pontos inválidos ou ausentes (linha rejeitada)`, {
                            rowNumber: row.rowNumber,
                            error: row.error,
                            cnpj: row.data?.cnpj,
                            saleId: row.data?.saleId,
                            executiveName: row.data?.executiveName,
                            points: row.data?.points
                        }, 'PONTUACAO');
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
                    importLogger_1.importLogger.logWarning(importId, `Linha ${row.rowNumber}: Registro pulado - ${reason}`, {
                        rowNumber: row.rowNumber,
                        reason: 'Dados inválidos',
                        error: 'Linha sem dados válidos'
                    });
                    importLogger_1.importLogger.logRowError(importId, row.rowNumber, reason);
                    continue;
                }
                // Verificar se promotor está ausente ou vazio
                if (!row.data.executiveName || row.data.executiveName.trim() === '') {
                    importLogger_1.importLogger.logWarning(importId, `Linha ${row.rowNumber}: Promotor ausente ou vazio`, { rowNumber: row.rowNumber, cnpj: row.data.cnpj, saleId: row.data.saleId });
                }
                // Verificar se pontuação é 0 ou null
                if (row.data.points === null || row.data.points === undefined || row.data.points === 0) {
                    importLogger_1.importLogger.logWarning(importId, `Linha ${row.rowNumber}: Pontuação é 0 ou null`, {
                        rowNumber: row.rowNumber,
                        points: row.data.points,
                        cnpj: row.data.cnpj,
                        saleId: row.data.saleId,
                        executiveName: row.data.executiveName
                    }, 'PONTUACAO');
                }
                // Verificar duplicata (saleId + company)
                if (row.data.saleId && row.data.company) {
                    const existing = await (0, db_1.query)('SELECT id FROM agency_points_import_items WHERE sale_id = ? AND company = ?', [row.data.saleId, row.data.company]);
                    if (Array.isArray(existing) && existing.length > 0) {
                        skipped++;
                        const reason = `Duplicata: saleId=${row.data.saleId}, company=${row.data.company}`;
                        errors.push({
                            rowNumber: row.rowNumber,
                            reason
                        });
                        // Log do registro pulado
                        importLogger_1.importLogger.logWarning(importId, `Linha ${row.rowNumber}: Registro pulado - ${reason}`, {
                            rowNumber: row.rowNumber,
                            reason: 'Duplicata',
                            saleId: row.data.saleId,
                            company: row.data.company,
                            cnpj: row.data.cnpj,
                            agencyName: row.data.agencyName,
                            points: row.data.points,
                            existingRecordId: existing[0]?.id
                        }, 'DUPLICATA');
                        // Atualizar progresso mesmo para linhas puladas
                        if ((i + 1) % updateInterval === 0) {
                            await (0, db_1.query)('UPDATE agency_points_imports SET processed_rows = ? WHERE id = ?', [i + 1, importId]);
                        }
                        continue;
                    }
                }
                // Inserir item
                try {
                    // Preparar data para inserção no MySQL
                    // normalizeDate já retorna string 'YYYY-MM-DD', que é o formato esperado pelo MySQL DATE
                    let saleDateForDb = null;
                    // Verificar se saleDate existe e não é null/undefined
                    if (row.data.saleDate !== null && row.data.saleDate !== undefined) {
                        // normalizeDate já retorna 'YYYY-MM-DD', usar diretamente
                        const saleDateValue = row.data.saleDate;
                        if (typeof saleDateValue === 'string') {
                            // Verificar se está no formato correto
                            if (/^\d{4}-\d{2}-\d{2}$/.test(saleDateValue)) {
                                saleDateForDb = saleDateValue;
                            }
                            else if (saleDateValue.trim() !== '' && saleDateValue.toLowerCase() !== 'null') {
                                // Tentar converter se não estiver no formato esperado
                                const dateObj = new Date(saleDateValue);
                                if (!isNaN(dateObj.getTime())) {
                                    saleDateForDb = dateObj.toISOString().split('T')[0];
                                }
                                else {
                                    console.warn(`⚠️  Linha ${row.rowNumber}: Não foi possível converter saleDate="${saleDateValue}"`);
                                }
                            }
                        }
                        else if (saleDateValue instanceof Date) {
                            // Se for objeto Date, converter para string
                            if (!isNaN(saleDateValue.getTime())) {
                                saleDateForDb = saleDateValue.toISOString().split('T')[0];
                            }
                        }
                        else if (typeof saleDateValue === 'number') {
                            // Se for número (Excel serial date), converter
                            try {
                                const excelEpoch = new Date(1900, 0, 1);
                                const date = new Date(excelEpoch.getTime() + (saleDateValue - 2) * 24 * 60 * 60 * 1000);
                                if (!isNaN(date.getTime())) {
                                    saleDateForDb = date.toISOString().split('T')[0];
                                }
                            }
                            catch (error) {
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
                    await (0, db_1.query)(`INSERT INTO agency_points_import_items 
                        (import_id, sale_id, sale_date, cnpj, agency_name, branch, store, executive_name, supplier, product_name, company, points) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, insertParams);
                    inserted++;
                }
                catch (error) {
                    // Erro ao inserir (ex: constraint violation)
                    skipped++;
                    const errorMessage = error instanceof Error ? error.message : 'Erro ao inserir no banco de dados';
                    errors.push({
                        rowNumber: row.rowNumber,
                        reason: errorMessage
                    });
                    // Log do registro pulado por erro de inserção
                    importLogger_1.importLogger.logError(importId, `Linha ${row.rowNumber}: Registro pulado - Erro ao inserir no banco de dados`, error instanceof Error ? error : new Error(errorMessage), {
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
                    });
                    importLogger_1.importLogger.logRowError(importId, row.rowNumber, `Erro ao inserir no banco: ${errorMessage}`, row.data);
                }
                // Atualizar progresso periodicamente
                if ((i + 1) % updateInterval === 0 || i === processResult.rows.length - 1) {
                    await (0, db_1.query)('UPDATE agency_points_imports SET processed_rows = ? WHERE id = ?', [i + 1, importId]);
                }
            }
            // Finalizar com sucesso
            await (0, db_1.query)('UPDATE agency_points_imports SET status = ?, processed_rows = ?, finished_at = NOW() WHERE id = ?', ['DONE', processResult.rows.length, importId]);
            // Resumo final dos registros pulados
            const skippedByReason = errors.reduce((acc, err) => {
                const reason = err.reason || 'Motivo desconhecido';
                if (!acc[reason]) {
                    acc[reason] = 0;
                }
                acc[reason]++;
                return acc;
            }, {});
            importLogger_1.importLogger.logInfo(importId, `Importação concluída: ${inserted} inseridos, ${skipped} pulados, ${errors.length} erros`, {
                inserted,
                skipped,
                totalErrors: errors.length,
                skippedByReason,
                totalRows: processResult.rows.length
            });
            // Log detalhado do resumo de registros pulados
            if (skipped > 0) {
                importLogger_1.importLogger.logWarning(importId, `Resumo de registros pulados (${skipped} total):`, {
                    totalSkipped: skipped,
                    breakdown: skippedByReason,
                    sampleErrors: errors.slice(0, 10) // Primeiros 10 erros como exemplo
                });
            }
        }
        catch (error) {
            // Finalizar com erro
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            await (0, db_1.query)('UPDATE agency_points_imports SET status = ?, error_message = ?, finished_at = NOW() WHERE id = ?', ['FAILED', errorMessage.substring(0, 1000), importId] // Limitar tamanho da mensagem
            );
            importLogger_1.importLogger.logError(importId, 'Erro fatal ao processar importação', error instanceof Error ? error : new Error(String(error)), { filePath, errorMessage });
            throw error;
        }
        finally {
            // Remover arquivo após processamento
            if (fs_1.default.existsSync(filePath)) {
                try {
                    fs_1.default.unlinkSync(filePath);
                    console.log(`🗑️  Arquivo temporário removido: ${filePath}`);
                }
                catch (unlinkError) {
                    console.warn('Erro ao remover arquivo temporário:', unlinkError);
                }
            }
        }
    },
    /**
     * Deleta uma importação e todos os seus itens
     * IMPORTANTE: Não afeta o ledger, apenas remove os registros de importação
     */
    async delete(importId) {
        // Verificar se import existe
        const importData = await this.findById(importId);
        if (!importData) {
            throw new Error('Import not found');
        }
        // Deletar todos os itens da importação primeiro (foreign key constraint)
        await (0, db_1.query)('DELETE FROM agency_points_import_items WHERE import_id = ?', [importId]);
        // Deletar a importação
        await (0, db_1.query)('DELETE FROM agency_points_imports WHERE id = ?', [importId]);
    }
};
