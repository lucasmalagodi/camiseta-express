"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardWidgetController = exports.reportController = void 0;
const reportService_1 = require("../services/reportService");
exports.reportController = {
    // Criar relatório
    async create(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado',
                });
            }
            const dto = {
                name: req.body.name,
                sourceTable: req.body.sourceTable,
                visualizationType: req.body.visualizationType,
                config: req.body.config,
                isPublic: req.body.isPublic,
            };
            // Validações básicas
            if (!dto.name || !dto.sourceTable || !dto.config) {
                return res.status(400).json({
                    success: false,
                    message: 'Campos obrigatórios: name, sourceTable, config',
                });
            }
            const report = await reportService_1.reportService.createReport(dto, userId);
            res.status(201).json({ success: true, data: report });
        }
        catch (error) {
            console.error('Error creating report:', error);
            const errorMessage = error?.message || error?.toString() || 'Erro ao criar relatório';
            console.error('Error message:', errorMessage);
            console.error('Error stack:', error?.stack);
            res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }
    },
    // Listar todos os relatórios
    async getAll(req, res) {
        try {
            const userId = req.user?.id;
            let reports;
            if (userId) {
                // Se tem usuário autenticado, retornar apenas públicos ou do próprio usuário
                reports = await reportService_1.reportService.getAvailableReportsForUser(userId);
            }
            else {
                // Se não tem usuário, retornar apenas públicos
                reports = await reportService_1.reportService.getAllReports().then(rs => rs.filter(r => r.isPublic));
            }
            res.json({ success: true, data: reports });
        }
        catch (error) {
            console.error('Error fetching reports:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar relatórios',
            });
        }
    },
    // Buscar relatório por ID
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }
            const report = await reportService_1.reportService.getReportById(id);
            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Relatório não encontrado',
                });
            }
            res.json({ success: true, data: report });
        }
        catch (error) {
            console.error('Error fetching report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar relatório',
            });
        }
    },
    // Atualizar relatório
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }
            const dto = {
                name: req.body.name,
                sourceTable: req.body.sourceTable,
                visualizationType: req.body.visualizationType,
                config: req.body.config,
                isPublic: req.body.isPublic,
            };
            // Remover campos undefined
            Object.keys(dto).forEach(key => {
                if (dto[key] === undefined) {
                    delete dto[key];
                }
            });
            const report = await reportService_1.reportService.updateReport(id, dto);
            res.json({ success: true, data: report });
        }
        catch (error) {
            console.error('Error updating report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao atualizar relatório',
            });
        }
    },
    // Deletar relatório
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }
            await reportService_1.reportService.deleteReport(id);
            res.json({ success: true, message: 'Relatório deletado com sucesso' });
        }
        catch (error) {
            console.error('Error deleting report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao deletar relatório',
            });
        }
    },
    // Executar relatório
    async execute(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }
            const data = await reportService_1.reportService.executeReport(id);
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('Error executing report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao executar relatório',
            });
        }
    },
    // Executar relatório com configuração direta (preview)
    async preview(req, res) {
        try {
            const { sourceTable, config } = req.body;
            if (!sourceTable || !config) {
                return res.status(400).json({
                    success: false,
                    message: 'Campos obrigatórios: sourceTable, config',
                });
            }
            const data = await reportService_1.reportService.executeReportConfig(sourceTable, config);
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('Error previewing report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao visualizar preview do relatório',
            });
        }
    },
    // Obter campos disponíveis
    async getAvailableFields(req, res) {
        try {
            const { table } = req.query;
            if (!table) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro "table" é obrigatório',
                });
            }
            const fields = reportService_1.reportService.getAvailableFields(table);
            res.json({ success: true, data: fields });
        }
        catch (error) {
            console.error('Error fetching available fields:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar campos disponíveis',
            });
        }
    },
};
// Controller para widgets do dashboard
exports.dashboardWidgetController = {
    // Criar widget
    async create(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado',
                });
            }
            const { reportId, position, expanded } = req.body;
            if (!reportId) {
                return res.status(400).json({
                    success: false,
                    message: 'Campo obrigatório: reportId',
                });
            }
            const widget = await reportService_1.reportService.createDashboardWidget({
                reportId,
                position,
                expanded,
            }, userId);
            res.status(201).json({ success: true, data: widget });
        }
        catch (error) {
            console.error('Error creating widget:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao criar widget',
            });
        }
    },
    // Listar widgets ativos
    async getActive(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado',
                });
            }
            const widgets = await reportService_1.reportService.getActiveDashboardWidgets(userId);
            res.json({ success: true, data: widgets });
        }
        catch (error) {
            console.error('Error fetching widgets:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar widgets',
            });
        }
    },
    // Buscar widget por ID
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }
            const widget = await reportService_1.reportService.getDashboardWidgetById(id);
            if (!widget) {
                return res.status(404).json({
                    success: false,
                    message: 'Widget não encontrado',
                });
            }
            res.json({ success: true, data: widget });
        }
        catch (error) {
            console.error('Error fetching widget:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar widget',
            });
        }
    },
    // Atualizar widget
    async update(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado',
                });
            }
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }
            const { position, expanded, active } = req.body;
            const widget = await reportService_1.reportService.updateDashboardWidget(id, {
                position,
                expanded,
                active,
            }, userId);
            res.json({ success: true, data: widget });
        }
        catch (error) {
            console.error('Error updating widget:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao atualizar widget',
            });
        }
    },
    // Deletar widget
    async delete(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado',
                });
            }
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }
            await reportService_1.reportService.deleteDashboardWidget(id, userId);
            res.json({ success: true, message: 'Widget deletado com sucesso' });
        }
        catch (error) {
            console.error('Error deleting widget:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao deletar widget',
            });
        }
    },
};
