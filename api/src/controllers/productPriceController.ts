import { Request, Response } from 'express';
import { z } from 'zod';
import { productPriceService } from '../services/productPriceService';
import { productService } from '../services/productService';

const createProductPriceSchema = z.object({
    value: z.number().positive(),
    batch: z.number().int().positive(),
    quantidadeCompra: z.number().int().min(0).optional()
});

const updateProductPriceSchema = z.object({
    value: z.number().positive().optional(),
    batch: z.number().int().positive().optional(),
    quantidadeCompra: z.number().int().min(0).optional(),
    active: z.boolean().optional()
});

export const productPriceController = {
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

            const data = createProductPriceSchema.parse(req.body);
            const id = await productPriceService.create(productId, data);
            res.status(201).json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input' });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            const priceId = parseInt(req.params.priceId as string);
            
            if (isNaN(productId) || isNaN(priceId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const price = await productPriceService.findById(productId, priceId);
            if (!price) {
                return res.status(404).json({ message: 'Product price not found' });
            }

            const data = updateProductPriceSchema.parse(req.body);
            await productPriceService.update(productId, priceId, data);
            res.json({ success: true, id: priceId });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input' });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            const priceId = parseInt(req.params.priceId as string);
            
            if (isNaN(productId) || isNaN(priceId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const price = await productPriceService.findById(productId, priceId);
            if (!price) {
                return res.status(404).json({ message: 'Product price not found' });
            }

            await productPriceService.softDelete(productId, priceId);
            res.json({ success: true, id: priceId });
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

            const prices = await productPriceService.findAllByProductId(productId);
            res.json({ data: prices, total: prices.length });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
