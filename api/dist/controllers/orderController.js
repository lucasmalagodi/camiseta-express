"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderController = void 0;
const zod_1 = require("zod");
const orderService_1 = require("../services/orderService");
const agencyService_1 = require("../services/agencyService");
const createOrderItemSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive(),
    quantity: zod_1.z.number().int().positive()
});
const createOrderSchema = zod_1.z.object({
    items: zod_1.z.array(createOrderItemSchema).min(1)
});
exports.orderController = {
    async create(req, res) {
        try {
            const agencyId = parseInt(req.params.agencyId);
            if (isNaN(agencyId)) {
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
            res.json({ ...order, items });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getByAgencyId(req, res) {
        try {
            const agencyId = parseInt(req.params.agencyId);
            if (isNaN(agencyId)) {
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
            const agencyId = parseInt(req.params.agencyId);
            const productId = parseInt(req.params.productId);
            if (isNaN(agencyId) || isNaN(productId)) {
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
            await orderService_1.orderService.cancel(id);
            res.json({ success: true, id });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('not found') || error.message.includes('Only PENDING')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error(error);
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
