import { Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { productImageService } from '../services/productImageService';
import { productService } from '../services/productService';

const createProductImageSchema = z.object({
    path: z.string().min(1),
    name: z.string().min(1)
});

const updateProductImageSchema = z.object({
    path: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    active: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    favorite: z.boolean().optional()
});

const updateOrderSchema = z.object({
    updates: z.array(z.object({
        id: z.number().int().positive(),
        displayOrder: z.number().int().min(0)
    })).min(1)
});

export const productImageController = {
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

            const data = createProductImageSchema.parse(req.body);
            const id = await productImageService.create(productId, data);
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
            const imageId = parseInt(req.params.imageId as string);
            
            if (isNaN(productId) || isNaN(imageId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const image = await productImageService.findById(productId, imageId);
            if (!image) {
                return res.status(404).json({ message: 'Product image not found' });
            }

            const data = updateProductImageSchema.parse(req.body);
            await productImageService.update(productId, imageId, data);
            res.json({ success: true, id: imageId });
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
            const imageId = parseInt(req.params.imageId as string);
            
            if (isNaN(productId) || isNaN(imageId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const image = await productImageService.findById(productId, imageId);
            if (!image) {
                return res.status(404).json({ message: 'Product image not found' });
            }

            // Deletar arquivo físico
            // Construir caminho completo do arquivo
            const imagePath = image.path;
            let filePath: string;
            
            // Função helper para obter o caminho base
            const getBaseAssetsPath = (): string => {
                if (process.env.NODE_ENV === 'production' || fs.existsSync('/src/assets')) {
                    return '/src/assets';
                }
                return path.resolve(__dirname, '../../src/assets');
            };
            
            const baseAssetsPath = getBaseAssetsPath();
            
            // Verificar se é caminho absoluto ou relativo
            if (imagePath.startsWith('/src/assets')) {
                // Caminho relativo: /src/assets/product/{categoria}/{arquivo}
                // Remover /src/assets do início
                const relativePath = imagePath.replace('/src/assets', '');
                filePath = path.join(baseAssetsPath, relativePath);
            } else if (imagePath.startsWith('/assets')) {
                // Caminho relativo: /assets/product/{categoria}/{arquivo} (dev)
                // Remover /assets do início
                const relativePath = imagePath.replace('/assets', '');
                filePath = path.join(baseAssetsPath, relativePath);
            } else if (imagePath.startsWith('http')) {
                // URL externa, não deletar
                filePath = '';
            } else {
                // Caminho relativo ou absoluto direto
                filePath = path.isAbsolute(imagePath) 
                    ? imagePath 
                    : path.join(baseAssetsPath, imagePath);
            }

            // Deletar arquivo se existir
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log('✅ Arquivo deletado:', filePath);
                } catch (fileError) {
                    console.error('⚠️ Erro ao deletar arquivo:', fileError);
                    // Continuar mesmo se não conseguir deletar o arquivo
                }
            }

            // Deletar do banco de dados (hard delete)
            await productImageService.hardDelete(productId, imageId);
            res.json({ success: true, id: imageId });
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

            const images = await productImageService.findAllByProductId(productId);
            res.json({ data: images, total: images.length });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async updateOrder(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }

            const product = await productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const data = updateOrderSchema.parse(req.body);
            await productImageService.updateOrder(productId, data.updates);
            res.json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    }
};
