"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shipmentController = void 0;
const zod_1 = require("zod");
const shipmentService_1 = require("../services/shipmentService");
const shipmentStatusSchema = zod_1.z.enum(['PENDING', 'READY_TO_POST', 'POSTED', 'DELIVERED', 'CANCELED']);
const createShipmentSchema = zod_1.z.object({
    orderIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1),
    shippingMethod: zod_1.z.string().min(1).max(64).optional()
});
const updateShipmentSchema = zod_1.z.object({
    status: shipmentStatusSchema.optional(),
    trackingCode: zod_1.z.union([zod_1.z.string().max(128), zod_1.z.null()]).optional(),
    shippingMethod: zod_1.z.string().min(1).max(64).optional(),
    postedAt: zod_1.z.union([zod_1.z.string().max(40), zod_1.z.null()]).optional()
});
const markOrderProcessedSchema = zod_1.z.object({
    orderId: zod_1.z.number().int().positive()
});
const finalizeBatchSchema = zod_1.z.object({
    orderIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1)
});
function parseOptionalInt(q) {
    if (q === undefined || q === null || q === '')
        return undefined;
    const n = parseInt(String(q), 10);
    return Number.isNaN(n) ? undefined : n;
}
exports.shipmentController = {
    async listPendingOrders(req, res) {
        try {
            const filters = {
                agencyId: parseOptionalInt(req.query.agencyId),
                dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
                branchId: parseOptionalInt(req.query.branchId),
                executiveId: parseOptionalInt(req.query.executiveId)
            };
            const data = await shipmentService_1.shipmentService.listPendingOrdersForShipping(filters);
            res.json({ data, total: data.length });
        }
        catch (error) {
            console.error('listPendingOrders:', error);
            res.status(500).json({ message: 'Erro ao listar pedidos aguardando envio.' });
        }
    },
    async listProcessedOrders(req, res) {
        try {
            const status = req.query.status ? shipmentStatusSchema.parse(req.query.status) : undefined;
            const agencyId = parseOptionalInt(req.query.agencyId);
            const data = await shipmentService_1.shipmentService.listProcessedOrdersForAdmin({ status, agencyId });
            res.json({ data, total: data.length });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Filtro inválido', errors: error.issues });
            }
            console.error('listProcessedOrders:', error);
            res.status(500).json({ message: 'Erro ao listar pedidos processados.' });
        }
    },
    async createBatch(req, res) {
        try {
            const body = createShipmentSchema.parse(req.body);
            const shipments = await shipmentService_1.shipmentService.createBatchFromOrders(body);
            res.status(201).json({ success: true, shipments, count: shipments.length });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('create batch shipments:', error);
            res.status(500).json({ message: 'Erro ao criar remessas.' });
        }
    },
    async create(req, res) {
        try {
            const body = createShipmentSchema.parse(req.body);
            const id = await shipmentService_1.shipmentService.createFromOrders(body);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('create shipment:', error);
            res.status(500).json({ message: 'Erro ao criar remessa.' });
        }
    },
    async list(req, res) {
        try {
            const status = req.query.status ? shipmentStatusSchema.parse(req.query.status) : undefined;
            const agencyId = parseOptionalInt(req.query.agencyId);
            const data = await shipmentService_1.shipmentService.list({ status, agencyId });
            res.json({ data, total: data.length });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Filtro inválido', errors: error.issues });
            }
            console.error('list shipments:', error);
            res.status(500).json({ message: 'Erro ao listar remessas.' });
        }
    },
    async getPreparationQueue(req, res) {
        try {
            const data = await shipmentService_1.shipmentService.getPreparationQueue();
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.json({ data, total: data.length });
        }
        catch (error) {
            console.error('getPreparationQueue:', error);
            res.status(500).json({ message: 'Erro ao carregar fila de preparação.' });
        }
    },
    async markOrderProcessed(req, res) {
        try {
            const body = markOrderProcessedSchema.parse(req.body);
            const result = await shipmentService_1.shipmentService.markOrderProcessedInPreparation(body.orderId);
            res.json({ success: true, ...result });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('markOrderProcessed:', error);
            res.status(500).json({ message: 'Erro ao marcar pedido como processado.' });
        }
    },
    async finalizePreparationBatch(req, res) {
        try {
            const body = finalizeBatchSchema.parse(req.body);
            const result = await shipmentService_1.shipmentService.finalizePreparationBatch(body.orderIds);
            res.json({ success: true, ...result });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('finalizePreparationBatch:', error);
            res.status(500).json({ message: 'Erro ao finalizar lote.' });
        }
    },
    async listPreparationBatches(req, res) {
        try {
            const data = await shipmentService_1.shipmentService.listPreparationBatches();
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.json({ data, total: data.length });
        }
        catch (error) {
            console.error('listPreparationBatches:', error);
            res.status(500).json({ message: 'Erro ao listar lotes processados.' });
        }
    },
    async getPreparationBatchDetail(req, res) {
        try {
            const batchId = parseInt(req.params.batchId, 10);
            if (Number.isNaN(batchId)) {
                return res.status(400).json({ message: 'ID do lote inválido' });
            }
            const detail = await shipmentService_1.shipmentService.getPreparationBatchDetail(batchId);
            if (!detail) {
                return res.status(404).json({ message: 'Lote não encontrado' });
            }
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.json(detail);
        }
        catch (error) {
            console.error('getPreparationBatchDetail:', error);
            res.status(500).json({ message: 'Erro ao carregar lote.' });
        }
    },
    async exportPreparationBatchCsv(req, res) {
        try {
            const batchId = parseInt(req.params.batchId, 10);
            if (Number.isNaN(batchId)) {
                return res.status(400).json({ message: 'ID do lote inválido' });
            }
            const csv = await shipmentService_1.shipmentService.buildPreparationBatchCsv(batchId);
            const stamp = new Date().toISOString().slice(0, 10);
            const fname = `lote-${batchId}-${stamp}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
            res.send(csv);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Lote não encontrado.') {
                return res.status(404).json({ message: error.message });
            }
            console.error('exportPreparationBatchCsv:', error);
            res.status(500).json({ message: 'Erro ao gerar CSV do lote.' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const detail = await shipmentService_1.shipmentService.getDetail(id);
            if (!detail) {
                return res.status(404).json({ message: 'Remessa não encontrada' });
            }
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.json(detail);
        }
        catch (error) {
            console.error('get shipment:', error);
            res.status(500).json({ message: 'Erro ao buscar remessa.' });
        }
    },
    async update(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const body = updateShipmentSchema.parse(req.body);
            const updated = await shipmentService_1.shipmentService.update(id, body);
            if (!updated) {
                return res.status(404).json({ message: 'Remessa não encontrada' });
            }
            res.json(updated);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error('update shipment:', error);
            res.status(500).json({ message: 'Erro ao atualizar remessa.' });
        }
    }
};
