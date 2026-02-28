import { Request, Response } from 'express';
import { z } from 'zod';
import { productVariantService } from '../services/productVariantService';
import { productService } from '../services/productService';

const createProductVariantSchema = z.object({
    model: z.enum(['MASCULINO', 'FEMININO', 'UNISEX']),
    size: z.string().min(1),
    stock: z.number().int().min(0)
});

const updateProductVariantSchema = z.object({
    model: z.enum(['MASCULINO', 'FEMININO', 'UNISEX']).optional(),
    size: z.string().min(1).optional(),
    stock: z.number().int().min(0).optional(),
    active: z.boolean().optional()
});

export const productVariantController = {
    async create(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const data = createProductVariantSchema.parse(req.body);
            const id = await productVariantService.create(productId, data);
            res.status(201).json({ success: true, id });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error.message && error.message.includes('já existe')) {
                return res.status(400).json({ message: error.message });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            const variantId = parseInt(req.params.variantId as string);
            
            if (isNaN(productId) || isNaN(variantId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const variant = await productVariantService.findById(variantId);
            if (!variant || variant.productId !== productId) {
                return res.status(404).json({ message: 'Variant not found' });
            }

            const data = updateProductVariantSchema.parse(req.body);
            await productVariantService.update(variantId, data);
            res.json({ success: true, id: variantId });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error.message && error.message.includes('já existe')) {
                return res.status(400).json({ message: error.message });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            const variantId = parseInt(req.params.variantId as string);
            
            if (isNaN(productId) || isNaN(variantId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const variant = await productVariantService.findById(variantId);
            if (!variant || variant.productId !== productId) {
                return res.status(404).json({ message: 'Variant not found' });
            }

            await productVariantService.delete(variantId);
            res.json({ success: true, id: variantId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAll(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const activeOnly = req.query.activeOnly === 'true';
            const variants = await productVariantService.findByProductId(productId, activeOnly);
            res.json({ data: variants, total: variants.length });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
