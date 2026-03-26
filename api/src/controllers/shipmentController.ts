import { Request, Response } from 'express';
import { z } from 'zod';
import { shipmentService } from '../services/shipmentService';

const shipmentStatusSchema = z.enum(['PENDING', 'READY_TO_POST', 'POSTED', 'DELIVERED', 'CANCELED']);

const createShipmentSchema = z.object({
    orderIds: z.array(z.number().int().positive()).min(1),
    shippingMethod: z.string().min(1).max(64).optional()
});

const updateShipmentSchema = z.object({
    status: shipmentStatusSchema.optional(),
    trackingCode: z.union([z.string().max(128), z.null()]).optional(),
    shippingMethod: z.string().min(1).max(64).optional(),
    postedAt: z.union([z.string().max(40), z.null()]).optional()
});

const markOrderProcessedSchema = z.object({
    orderId: z.number().int().positive()
});

const finalizeBatchSchema = z.object({
    orderIds: z.array(z.number().int().positive()).min(1)
});

function parseOptionalInt(q: unknown): number | undefined {
    if (q === undefined || q === null || q === '') return undefined;
    const n = parseInt(String(q), 10);
    return Number.isNaN(n) ? undefined : n;
}

export const shipmentController = {
    async listPendingOrders(req: Request, res: Response) {
        try {
            const filters = {
                agencyId: parseOptionalInt(req.query.agencyId),
                dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
                branchId: parseOptionalInt(req.query.branchId),
                executiveId: parseOptionalInt(req.query.executiveId)
            };
            const data = await shipmentService.listPendingOrdersForShipping(filters);
            res.json({ data, total: data.length });
        } catch (error) {
            console.error('listPendingOrders:', error);
            res.status(500).json({ message: 'Erro ao listar pedidos aguardando envio.' });
        }
    },

    async listProcessedOrders(req: Request, res: Response) {
        try {
            const status = req.query.status ? shipmentStatusSchema.parse(req.query.status) : undefined;
            const agencyId = parseOptionalInt(req.query.agencyId);
            const data = await shipmentService.listProcessedOrdersForAdmin({ status, agencyId });
            res.json({ data, total: data.length });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Filtro inválido', errors: error.issues });
            }
            console.error('listProcessedOrders:', error);
            res.status(500).json({ message: 'Erro ao listar pedidos processados.' });
        }
    },

    async createBatch(req: Request, res: Response) {
        try {
            const body = createShipmentSchema.parse(req.body);
            const shipments = await shipmentService.createBatchFromOrders(body);
            res.status(201).json({ success: true, shipments, count: shipments.length });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('create batch shipments:', error);
            res.status(500).json({ message: 'Erro ao criar remessas.' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const body = createShipmentSchema.parse(req.body);
            const id = await shipmentService.createFromOrders(body);
            res.status(201).json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('create shipment:', error);
            res.status(500).json({ message: 'Erro ao criar remessa.' });
        }
    },

    async list(req: Request, res: Response) {
        try {
            const status = req.query.status ? shipmentStatusSchema.parse(req.query.status) : undefined;
            const agencyId = parseOptionalInt(req.query.agencyId);
            const data = await shipmentService.list({ status, agencyId });
            res.json({ data, total: data.length });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Filtro inválido', errors: error.issues });
            }
            console.error('list shipments:', error);
            res.status(500).json({ message: 'Erro ao listar remessas.' });
        }
    },

    async getPreparationQueue(req: Request, res: Response) {
        try {
            const data = await shipmentService.getPreparationQueue();
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.json({ data, total: data.length });
        } catch (error) {
            console.error('getPreparationQueue:', error);
            res.status(500).json({ message: 'Erro ao carregar fila de preparação.' });
        }
    },

    async markOrderProcessed(req: Request, res: Response) {
        try {
            const body = markOrderProcessedSchema.parse(req.body);
            const result = await shipmentService.markOrderProcessedInPreparation(body.orderId);
            res.json({ success: true, ...result });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('markOrderProcessed:', error);
            res.status(500).json({ message: 'Erro ao marcar pedido como processado.' });
        }
    },

    async finalizePreparationBatch(req: Request, res: Response) {
        try {
            const body = finalizeBatchSchema.parse(req.body);
            const result = await shipmentService.finalizePreparationBatch(body.orderIds);
            res.json({ success: true, ...result });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('finalizePreparationBatch:', error);
            res.status(500).json({ message: 'Erro ao finalizar lote.' });
        }
    },

    async listPreparationBatches(req: Request, res: Response) {
        try {
            const data = await shipmentService.listPreparationBatches();
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.json({ data, total: data.length });
        } catch (error) {
            console.error('listPreparationBatches:', error);
            res.status(500).json({ message: 'Erro ao listar lotes processados.' });
        }
    },

    async getPreparationBatchDetail(req: Request, res: Response) {
        try {
            const batchId = parseInt(req.params.batchId as string, 10);
            if (Number.isNaN(batchId)) {
                return res.status(400).json({ message: 'ID do lote inválido' });
            }
            const detail = await shipmentService.getPreparationBatchDetail(batchId);
            if (!detail) {
                return res.status(404).json({ message: 'Lote não encontrado' });
            }
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.json(detail);
        } catch (error) {
            console.error('getPreparationBatchDetail:', error);
            res.status(500).json({ message: 'Erro ao carregar lote.' });
        }
    },

    async exportPreparationBatchCsv(req: Request, res: Response) {
        try {
            const batchId = parseInt(req.params.batchId as string, 10);
            if (Number.isNaN(batchId)) {
                return res.status(400).json({ message: 'ID do lote inválido' });
            }
            const csv = await shipmentService.buildPreparationBatchCsv(batchId);
            const stamp = new Date().toISOString().slice(0, 10);
            const fname = `lote-${batchId}-${stamp}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
            res.send(csv);
        } catch (error) {
            if (error instanceof Error && error.message === 'Lote não encontrado.') {
                return res.status(404).json({ message: error.message });
            }
            console.error('exportPreparationBatchCsv:', error);
            res.status(500).json({ message: 'Erro ao gerar CSV do lote.' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (Number.isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const detail = await shipmentService.getDetail(id);
            if (!detail) {
                return res.status(404).json({ message: 'Remessa não encontrada' });
            }
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.json(detail);
        } catch (error) {
            console.error('get shipment:', error);
            res.status(500).json({ message: 'Erro ao buscar remessa.' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (Number.isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const body = updateShipmentSchema.parse(req.body);
            const updated = await shipmentService.update(id, body);
            if (!updated) {
                return res.status(404).json({ message: 'Remessa não encontrada' });
            }
            res.json(updated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error('update shipment:', error);
            res.status(500).json({ message: 'Erro ao atualizar remessa.' });
        }
    }
};
