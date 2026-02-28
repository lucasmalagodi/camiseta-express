"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productVariantController = void 0;
const zod_1 = require("zod");
const productVariantService_1 = require("../services/productVariantService");
const productService_1 = require("../services/productService");
const createProductVariantSchema = zod_1.z.object({
    model: zod_1.z.enum(['MASCULINO', 'FEMININO', 'UNISEX']),
    size: zod_1.z.string().min(1),
    stock: zod_1.z.number().int().min(0)
});
const updateProductVariantSchema = zod_1.z.object({
    model: zod_1.z.enum(['MASCULINO', 'FEMININO', 'UNISEX']).optional(),
    size: zod_1.z.string().min(1).optional(),
    stock: zod_1.z.number().int().min(0).optional(),
    active: zod_1.z.boolean().optional()
});
exports.productVariantController = {
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
            const data = createProductVariantSchema.parse(req.body);
            const id = await productVariantService_1.productVariantService.create(productId, data);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error.message && error.message.includes('já existe')) {
                return res.status(400).json({ message: error.message });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const productId = parseInt(req.params.id);
            const variantId = parseInt(req.params.variantId);
            if (isNaN(productId) || isNaN(variantId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const variant = await productVariantService_1.productVariantService.findById(variantId);
            if (!variant || variant.productId !== productId) {
                return res.status(404).json({ message: 'Variant not found' });
            }
            const data = updateProductVariantSchema.parse(req.body);
            await productVariantService_1.productVariantService.update(variantId, data);
            res.json({ success: true, id: variantId });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error.message && error.message.includes('já existe')) {
                return res.status(400).json({ message: error.message });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const productId = parseInt(req.params.id);
            const variantId = parseInt(req.params.variantId);
            if (isNaN(productId) || isNaN(variantId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const variant = await productVariantService_1.productVariantService.findById(variantId);
            if (!variant || variant.productId !== productId) {
                return res.status(404).json({ message: 'Variant not found' });
            }
            await productVariantService_1.productVariantService.delete(variantId);
            res.json({ success: true, id: variantId });
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
            const activeOnly = req.query.activeOnly === 'true';
            const variants = await productVariantService_1.productVariantService.findByProductId(productId, activeOnly);
            res.json({ data: variants, total: variants.length });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
