"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productPriceController = void 0;
const zod_1 = require("zod");
const productPriceService_1 = require("../services/productPriceService");
const productService_1 = require("../services/productService");
const createProductPriceSchema = zod_1.z.object({
    value: zod_1.z.number().positive(),
    batch: zod_1.z.number().int().positive(),
    quantidadeCompra: zod_1.z.number().int().min(0).optional()
});
const updateProductPriceSchema = zod_1.z.object({
    value: zod_1.z.number().positive().optional(),
    batch: zod_1.z.number().int().positive().optional(),
    quantidadeCompra: zod_1.z.number().int().min(0).optional(),
    active: zod_1.z.boolean().optional()
});
exports.productPriceController = {
    async create(req, res) {
        try {
            const productId = parseInt(req.params.id);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const data = createProductPriceSchema.parse(req.body);
            const id = await productPriceService_1.productPriceService.create(productId, data);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input' });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const productId = parseInt(req.params.id);
            const priceId = parseInt(req.params.priceId);
            if (isNaN(productId) || isNaN(priceId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const price = await productPriceService_1.productPriceService.findById(productId, priceId);
            if (!price) {
                return res.status(404).json({ message: 'Product price not found' });
            }
            const data = updateProductPriceSchema.parse(req.body);
            await productPriceService_1.productPriceService.update(productId, priceId, data);
            res.json({ success: true, id: priceId });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input' });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const productId = parseInt(req.params.id);
            const priceId = parseInt(req.params.priceId);
            if (isNaN(productId) || isNaN(priceId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const price = await productPriceService_1.productPriceService.findById(productId, priceId);
            if (!price) {
                return res.status(404).json({ message: 'Product price not found' });
            }
            await productPriceService_1.productPriceService.softDelete(productId, priceId);
            res.json({ success: true, id: priceId });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getAll(req, res) {
        try {
            const productId = parseInt(req.params.id);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const prices = await productPriceService_1.productPriceService.findAllByProductId(productId);
            res.json({ data: prices, total: prices.length });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
