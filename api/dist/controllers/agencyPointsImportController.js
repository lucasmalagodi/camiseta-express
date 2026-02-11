"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agencyPointsImportController = void 0;
const zod_1 = require("zod");
const agencyPointsImportService_1 = require("../services/agencyPointsImportService");
const importLogger_1 = require("../utils/importLogger");
const fs_1 = __importDefault(require("fs"));
const createImportItemSchema = zod_1.z.object({
    saleId: zod_1.z.string().optional().nullable(),
    saleDate: zod_1.z.string().optional().nullable(), // ISO date string
    cnpj: zod_1.z.string().min(1),
    agencyName: zod_1.z.string().optional().nullable(),
    branch: zod_1.z.string().optional().nullable(),
    store: zod_1.z.string().optional().nullable(),
    executiveName: zod_1.z.string().min(1),
    supplier: zod_1.z.string().optional().nullable(),
    productName: zod_1.z.string().optional().nullable(),
    company: zod_1.z.string().optional().nullable(),
    points: zod_1.z.number().positive() // Aceita valores decimais, não mais .int()
});
const createImportSchema = zod_1.z.object({
    referencePeriod: zod_1.z.string().min(1),
    checksum: zod_1.z.string().min(1),
    items: zod_1.z.array(createImportItemSchema).min(1)
});
exports.agencyPointsImportController = {
    async create(req, res) {
        try {
            const data = createImportSchema.parse(req.body);
            // Obter userId do token JWT (assumindo que está no req.user após autenticação)
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const id = await agencyPointsImportService_1.agencyPointsImportService.create(data, userId);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message.includes('already exists')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const importData = await agencyPointsImportService_1.agencyPointsImportService.findById(id);
            if (!importData) {
                return res.status(404).json({ message: 'Import not found' });
            }
            const items = await agencyPointsImportService_1.agencyPointsImportService.findItemsByImportId(id);
            res.json({ ...importData, items });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getAll(req, res) {
        try {
            const imports = await agencyPointsImportService_1.agencyPointsImportService.findAll();
            res.json({ data: imports, total: imports.length });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getItemsByCnpj(req, res) {
        try {
            const cnpj = req.params.cnpj;
            if (!cnpj) {
                return res.status(400).json({ message: 'CNPJ is required' });
            }
            const items = await agencyPointsImportService_1.agencyPointsImportService.findItemsByCnpj(cnpj);
            res.json({ data: items, total: items.length });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async upload(req, res) {
        let filePath = null;
        try {
            // Validar arquivo
            if (!req.file) {
                return res.status(400).json({ message: 'Arquivo não fornecido' });
            }
            filePath = req.file.path;
            // Validar período de referência
            const referencePeriod = req.body.referencePeriod;
            if (!referencePeriod || referencePeriod.trim() === '') {
                // Limpar arquivo se período inválido
                if (filePath && fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
                return res.status(400).json({ message: 'Período de referência é obrigatório' });
            }
            // Obter userId do token JWT
            const userId = req.user?.id;
            if (!userId) {
                // Limpar arquivo se não autorizado
                if (filePath && fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
                return res.status(401).json({ message: 'Unauthorized' });
            }
            // Verificar se há importação em processamento
            const hasProcessing = await agencyPointsImportService_1.agencyPointsImportService.hasProcessingImport();
            if (hasProcessing) {
                // Limpar arquivo se há processamento em andamento
                if (filePath && fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
                return res.status(409).json({
                    message: 'Já existe uma importação em processamento. Aguarde a conclusão antes de fazer um novo upload.'
                });
            }
            // Criar importação e iniciar processamento em background
            const importId = await agencyPointsImportService_1.agencyPointsImportService.createFromSpreadsheet(filePath, referencePeriod.trim(), userId);
            // Retornar imediatamente com importId
            res.status(201).json({
                success: true,
                importId,
                message: 'Upload iniciado. O processamento está sendo executado em background.'
            });
        }
        catch (error) {
            // Limpar arquivo em caso de erro
            if (filePath && fs_1.default.existsSync(filePath)) {
                try {
                    fs_1.default.unlinkSync(filePath);
                }
                catch (unlinkError) {
                    console.warn('Erro ao remover arquivo temporário após erro:', unlinkError);
                }
            }
            if (error instanceof Error) {
                // Erro de arquivo já importado
                if (error.message.includes('já foi importado') || error.message.includes('already exists')) {
                    return res.status(400).json({ message: error.message });
                }
                // Erro de processamento
                if (error.message.includes('não encontrado') || error.message.includes('vazia')) {
                    return res.status(400).json({ message: error.message });
                }
                // Erro de colunas obrigatórias
                if (error.message.includes('Colunas obrigatórias não encontradas')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            // Log detalhado do erro para debug
            console.error('Erro ao processar upload:', error);
            console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
            console.error('File path:', filePath);
            res.status(500).json({
                message: 'Erro interno ao processar planilha',
                error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
            });
        }
    },
    async getStatus(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const status = await agencyPointsImportService_1.agencyPointsImportService.getStatus(id);
            if (!status) {
                return res.status(404).json({ message: 'Import not found' });
            }
            res.json(status);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro ao buscar status da importação' });
        }
    },
    async getLogs(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            // Verificar se import existe
            const importData = await agencyPointsImportService_1.agencyPointsImportService.findById(id);
            if (!importData) {
                return res.status(404).json({ message: 'Import not found' });
            }
            // Obter categoria do query param (opcional)
            const category = req.query.category;
            // Buscar logs da importação (com filtro opcional por categoria)
            const logs = importLogger_1.importLogger.readImportLogs(id, undefined, category);
            // Contar logs por categoria para estatísticas
            const logsByCategory = logs.reduce((acc, log) => {
                const cat = log.category || 'OUTROS';
                if (!acc[cat]) {
                    acc[cat] = 0;
                }
                acc[cat]++;
                return acc;
            }, {});
            res.json({
                importId: id,
                logs,
                total: logs.length,
                category: category || null,
                statsByCategory: logsByCategory
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro ao buscar logs da importação' });
        }
    },
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            await agencyPointsImportService_1.agencyPointsImportService.delete(id);
            res.json({ success: true, message: 'Importação e todos os seus registros foram excluídos com sucesso' });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    return res.status(404).json({ message: error.message });
                }
            }
            console.error(error);
            res.status(500).json({ message: 'Erro ao excluir importação' });
        }
    }
};
