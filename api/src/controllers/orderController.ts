import { Request, Response } from 'express';
import { z } from 'zod';
import { orderService } from '../services/orderService';
import { agencyService } from '../services/agencyService';

const createOrderItemSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive()
});

const createOrderSchema = z.object({
    items: z.array(createOrderItemSchema).min(1)
});

export const orderController = {
    async create(req: Request, res: Response) {
        try {
            const agencyId = parseInt(req.params.agencyId as string);
            if (isNaN(agencyId)) {
                return res.status(400).json({ message: 'Invalid agency ID' });
            }

            // Verificar se agência existe e está ativa
            const agency = await agencyService.findById(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            if (!agency.active) {
                return res.status(400).json({ message: 'Agency is not active' });
            }

            const data = createOrderSchema.parse(req.body);
            const id = await orderService.create(agencyId, data);
            res.status(201).json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                // Erros de validação (estoque, pontos, produto não encontrado)
                if (error.message.includes('not found') || 
                    error.message.includes('inactive') || 
                    error.message.includes('Insufficient') ||
                    error.message.includes('No active price')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error('Error creating order:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const idParam = req.params.id as string;
            
            // Se o parâmetro não é numérico, não é um ID válido
            // Isso previne que rotas como /latest sejam interpretadas como /:id
            if (!/^\d+$/.test(idParam)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const order = await orderService.findById(id);
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            const items = await orderService.findItemsByOrderId(id);
            res.json({ ...order, items });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getByAgencyId(req: Request, res: Response) {
        try {
            const agencyId = parseInt(req.params.agencyId as string);
            if (isNaN(agencyId)) {
                return res.status(400).json({ message: 'Invalid agency ID' });
            }

            const orders = await orderService.findByAgencyId(agencyId);
            res.json({ data: orders, total: orders.length });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getProductPurchaseCount(req: Request, res: Response) {
        try {
            const agencyId = parseInt(req.params.agencyId as string);
            const productId = parseInt(req.params.productId as string);
            
            if (isNaN(agencyId) || isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid agency ID or product ID' });
            }

            const purchaseInfo = await orderService.getProductPurchaseCount(agencyId, productId);
            res.json(purchaseInfo);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAll(req: Request, res: Response) {
        try {
            const orders = await orderService.findAll();
            res.json({ data: orders, total: orders.length });
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getLatest(req: Request, res: Response) {
        try {
            const latestOrder = await orderService.getLatestOrder();
            if (!latestOrder) {
                return res.json({ order: null });
            }
            res.json({ order: latestOrder });
        } catch (error) {
            console.error('Error fetching latest order:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async cancel(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            await orderService.cancel(id);
            res.json({ success: true, id });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('not found') || error.message.includes('Only PENDING')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
