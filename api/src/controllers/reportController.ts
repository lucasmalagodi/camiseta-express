import { Request, Response } from 'express';
import { reportService } from '../services/reportService';
import { CreateReportDto, UpdateReportDto, ReportConfig } from '../types';

export const reportController = {
    // Criar relatório
    async create(req: Request, res: Response) {
        try {
            const userId = (req.user as any)?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado',
                });
            }

            const dto: CreateReportDto = {
                name: req.body.name,
                sourceTable: req.body.sourceTable,
                visualizationType: req.body.visualizationType,
                config: req.body.config,
            };

            // Validações básicas
            if (!dto.name || !dto.sourceTable || !dto.config) {
                return res.status(400).json({
                    success: false,
                    message: 'Campos obrigatórios: name, sourceTable, config',
                });
            }

            const report = await reportService.createReport(dto, userId);
            res.status(201).json({ success: true, data: report });
        } catch (error: any) {
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
    async getAll(req: Request, res: Response) {
        try {
            const reports = await reportService.getAllReports();
            res.json({ success: true, data: reports });
        } catch (error: any) {
            console.error('Error fetching reports:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar relatórios',
            });
        }
    },

    // Buscar relatório por ID
    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }

            const report = await reportService.getReportById(id);
            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Relatório não encontrado',
                });
            }

            res.json({ success: true, data: report });
        } catch (error: any) {
            console.error('Error fetching report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar relatório',
            });
        }
    },

    // Atualizar relatório
    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }

            const dto: UpdateReportDto = {
                name: req.body.name,
                sourceTable: req.body.sourceTable,
                visualizationType: req.body.visualizationType,
                config: req.body.config,
            };

            // Remover campos undefined
            Object.keys(dto).forEach(key => {
                if (dto[key as keyof UpdateReportDto] === undefined) {
                    delete dto[key as keyof UpdateReportDto];
                }
            });

            const report = await reportService.updateReport(id, dto);
            res.json({ success: true, data: report });
        } catch (error: any) {
            console.error('Error updating report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao atualizar relatório',
            });
        }
    },

    // Deletar relatório
    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }

            await reportService.deleteReport(id);
            res.json({ success: true, message: 'Relatório deletado com sucesso' });
        } catch (error: any) {
            console.error('Error deleting report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao deletar relatório',
            });
        }
    },

    // Executar relatório
    async execute(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }

            const data = await reportService.executeReport(id);
            res.json({ success: true, data });
        } catch (error: any) {
            console.error('Error executing report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao executar relatório',
            });
        }
    },

    // Executar relatório com configuração direta (preview)
    async preview(req: Request, res: Response) {
        try {
            const { sourceTable, config } = req.body;

            if (!sourceTable || !config) {
                return res.status(400).json({
                    success: false,
                    message: 'Campos obrigatórios: sourceTable, config',
                });
            }

            const data = await reportService.executeReportConfig(sourceTable, config);
            res.json({ success: true, data });
        } catch (error: any) {
            console.error('Error previewing report:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao visualizar preview do relatório',
            });
        }
    },

    // Obter campos disponíveis
    async getAvailableFields(req: Request, res: Response) {
        try {
            const { table } = req.query;
            if (!table) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro "table" é obrigatório',
                });
            }

            const fields = reportService.getAvailableFields(table as any);
            res.json({ success: true, data: fields });
        } catch (error: any) {
            console.error('Error fetching available fields:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar campos disponíveis',
            });
        }
    },
};

// Controller para widgets do dashboard
export const dashboardWidgetController = {
    // Criar widget
    async create(req: Request, res: Response) {
        try {
            const { reportId, position } = req.body;

            if (!reportId) {
                return res.status(400).json({
                    success: false,
                    message: 'Campo obrigatório: reportId',
                });
            }

            const widget = await reportService.createDashboardWidget({
                reportId,
                position,
            });

            res.status(201).json({ success: true, data: widget });
        } catch (error: any) {
            console.error('Error creating widget:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao criar widget',
            });
        }
    },

    // Listar widgets ativos
    async getActive(req: Request, res: Response) {
        try {
            const widgets = await reportService.getActiveDashboardWidgets();
            res.json({ success: true, data: widgets });
        } catch (error: any) {
            console.error('Error fetching widgets:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar widgets',
            });
        }
    },

    // Buscar widget por ID
    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }

            const widget = await reportService.getDashboardWidgetById(id);
            if (!widget) {
                return res.status(404).json({
                    success: false,
                    message: 'Widget não encontrado',
                });
            }

            res.json({ success: true, data: widget });
        } catch (error: any) {
            console.error('Error fetching widget:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar widget',
            });
        }
    },

    // Atualizar widget
    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }

            const { position, active } = req.body;
            const widget = await reportService.updateDashboardWidget(id, {
                position,
                active,
            });

            res.json({ success: true, data: widget });
        } catch (error: any) {
            console.error('Error updating widget:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao atualizar widget',
            });
        }
    },

    // Deletar widget
    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID inválido',
                });
            }

            await reportService.deleteDashboardWidget(id);
            res.json({ success: true, message: 'Widget deletado com sucesso' });
        } catch (error: any) {
            console.error('Error deleting widget:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao deletar widget',
            });
        }
    },
};
