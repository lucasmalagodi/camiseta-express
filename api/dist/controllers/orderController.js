"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderController = void 0;
const zod_1 = require("zod");
const orderService_1 = require("../services/orderService");
const agencyService_1 = require("../services/agencyService");
const createOrderItemSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive(),
    quantity: zod_1.z.number().int().positive(),
    variantId: zod_1.z.number().int().positive().optional() // modelo + tamanho (camisa)
});
const createOrderSchema = zod_1.z.object({
    items: zod_1.z.array(createOrderItemSchema).min(1)
});
const updateOrderItemVariantSchema = zod_1.z.object({
    productVariantId: zod_1.z.number().int().positive()
});
exports.orderController = {
    async create(req, res) {
        try {
            const agencyId = parseInt(req.params.agencyId, 10);
            if (Number.isNaN(agencyId) || agencyId < 1) {
                return res.status(400).json({ message: 'Invalid agency ID' });
            }
            // Verificar se agência existe e está ativa
            const agency = await agencyService_1.agencyService.findById(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }
            if (!agency.active) {
                return res.status(400).json({ message: 'Agency is not active' });
            }
            const data = createOrderSchema.parse(req.body);
            const id = await orderService_1.orderService.create(agencyId, data);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async getById(req, res) {
        try {
            const idParam = req.params.id;
            // Se o parâmetro não é numérico, não é um ID válido
            // Isso previne que rotas como /latest sejam interpretadas como /:id
            if (!/^\d+$/.test(idParam)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const order = await orderService_1.orderService.findById(id);
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
            const items = await orderService_1.orderService.findItemsByOrderId(id);
            const payload = { ...order, items };
            if (order.status === 'CANCELED') {
                const cancellation = await orderService_1.orderService.getCancellationByOrderId(id);
                if (cancellation)
                    payload.cancellation = cancellation;
            }
            res.json(payload);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getByAgencyId(req, res) {
        try {
            const agencyId = parseInt(req.params.agencyId, 10);
            if (Number.isNaN(agencyId) || agencyId < 1) {
                return res.status(400).json({ message: 'Invalid agency ID' });
            }
            const orders = await orderService_1.orderService.findByAgencyId(agencyId);
            res.json({ data: orders, total: orders.length });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getProductPurchaseCount(req, res) {
        try {
            const agencyId = parseInt(req.params.agencyId, 10);
            const productId = parseInt(req.params.productId, 10);
            if (Number.isNaN(agencyId) || agencyId < 1 || Number.isNaN(productId) || productId < 1) {
                return res.status(400).json({ message: 'Invalid agency ID or product ID' });
            }
            const purchaseInfo = await orderService_1.orderService.getProductPurchaseCount(agencyId, productId);
            res.json(purchaseInfo);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getAll(req, res) {
        try {
            const orders = await orderService_1.orderService.findAll();
            res.json({ data: orders, total: orders.length });
        }
        catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getLatest(req, res) {
        try {
            const latestOrder = await orderService_1.orderService.getLatestOrder();
            if (!latestOrder) {
                return res.json({ order: null });
            }
            res.json({ order: latestOrder });
        }
        catch (error) {
            console.error('Error fetching latest order:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async cancel(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const body = req.body || {};
            const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
            if (!reason) {
                return res.status(400).json({ message: 'O motivo do cancelamento é obrigatório.' });
            }
            const cancellation = await orderService_1.orderService.cancelWithReason(id, {
                reason,
                sendEmail: Boolean(body.sendEmail),
                emailMessage: typeof body.emailMessage === 'string' ? body.emailMessage.trim() : undefined
            });
            res.json({ success: true, id, cancellation });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('not found') || error.message.includes('Only CONFIRMED')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async updateOrderItemVariant(req, res) {
        try {
            const orderId = parseInt(req.params.orderId, 10);
            const itemId = parseInt(req.params.itemId, 10);
            if (Number.isNaN(orderId) || orderId < 1 || Number.isNaN(itemId) || itemId < 1) {
                return res.status(400).json({ message: 'IDs inválidos' });
            }
            const body = updateOrderItemVariantSchema.parse(req.body);
            const result = await orderService_1.orderService.updateOrderItemVariant(orderId, itemId, body.productVariantId);
            res.json({ success: true, ...result });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                return res.status(400).json({ message: error.message });
            }
            console.error('updateOrderItemVariant:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    // Endpoints para agências autenticadas (/me/orders)
    async getMyOrders(req, res) {
        try {
            // req.agency é definido pelo middleware protectAgency
            if (!req.agency || !req.agency.id) {
                return res.status(401).json({ message: 'Não autorizado' });
            }
            const orders = await orderService_1.orderService.findMyOrders(req.agency.id);
            res.json({ data: orders, total: orders.length });
        }
        catch (error) {
            console.error('Error fetching my orders:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getMyOrderById(req, res) {
        try {
            // req.agency é definido pelo middleware protectAgency
            if (!req.agency || !req.agency.id) {
                return res.status(401).json({ message: 'Não autorizado' });
            }
            const idParam = req.params.id;
            if (!/^\d+$/.test(idParam)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const order = await orderService_1.orderService.findMyOrderById(id, req.agency.id);
            if (!order) {
                return res.status(404).json({ message: 'Pedido não encontrado' });
            }
            res.json(order);
        }
        catch (error) {
            console.error('Error fetching my order:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
