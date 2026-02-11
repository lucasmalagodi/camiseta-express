import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';

export const dashboardController = {
    async getOrdersSummary(req: Request, res: Response) {
        try {
            const data = await dashboardService.getOrdersSummary();
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching orders summary:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar resumo de pedidos' 
            });
        }
    },

    async getTopAgencyByPoints(req: Request, res: Response) {
        try {
            const data = await dashboardService.getTopAgencyByPoints();
            res.json({ success: true, data });
        } catch (error: any) {
            console.error('Error fetching top agency by points:', error);
            const errorMessage = error?.message || 'Erro ao buscar agência com mais pontos';
            res.status(500).json({ 
                success: false, 
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            });
        }
    },

    async getTopAgencyByOrders(req: Request, res: Response) {
        try {
            const data = await dashboardService.getTopAgencyByOrders();
            res.json({ success: true, data });
        } catch (error: any) {
            console.error('Error fetching top agency by orders:', error);
            const errorMessage = error?.message || 'Erro ao buscar agência com mais pedidos';
            res.status(500).json({ 
                success: false, 
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            });
        }
    },

    async getAgencyOrders(req: Request, res: Response) {
        try {
            const agencyId = parseInt(req.params.id as string);
            if (isNaN(agencyId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID de agência inválido' 
                });
            }

            const data = await dashboardService.getAgencyOrders(agencyId);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching agency orders:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar pedidos da agência' 
            });
        }
    },

    async getTopSuppliers(req: Request, res: Response) {
        try {
            const data = await dashboardService.getTopSuppliers();
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching top suppliers:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar top fornecedores' 
            });
        }
    },

    async getProductsByBranch(req: Request, res: Response) {
        try {
            const data = await dashboardService.getProductsByBranchSimplified();
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching products by branch:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar produtos por filial' 
            });
        }
    },

    async getTopAgenciesWithoutOrders(req: Request, res: Response) {
        try {
            const data = await dashboardService.getTopAgenciesWithoutOrders();
            res.json({ success: true, data });
        } catch (error: any) {
            console.error('Error fetching top agencies without orders:', error);
            const errorMessage = error?.message || 'Erro ao buscar agências sem pedidos';
            res.status(500).json({ 
                success: false, 
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            });
        }
    },

    async getTopAgenciesNotRegistered(req: Request, res: Response) {
        try {
            const data = await dashboardService.getTopAgenciesNotRegistered();
            res.json({ success: true, data });
        } catch (error: any) {
            console.error('Error fetching top agencies not registered:', error);
            const errorMessage = error?.message || 'Erro ao buscar agências não cadastradas';
            res.status(500).json({ 
                success: false, 
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            });
        }
    }
};
