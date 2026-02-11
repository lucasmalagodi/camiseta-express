import { Request, Response } from 'express';
import { z } from 'zod';
import { heroProductService } from '../services/heroProductService';
import { productService } from '../services/productService';

const createHeroProductSchema = z.object({
    bannerType: z.enum(['PRODUCT', 'EXTERNAL']),
    productId: z.number().int().positive().optional(),
    externalUrl: z.string().url().optional(),
    imageDesktop: z.union([z.string().min(1), z.literal('')]).optional().transform(val => val === '' ? undefined : val),
    imageMobile: z.union([z.string().min(1), z.literal('')]).optional().transform(val => val === '' ? undefined : val),
    displayOrder: z.number().int().min(0).optional(),
    displayDuration: z.number().int().min(1).max(60).optional(),
    active: z.boolean().optional()
}).refine((data) => {
    if (data.bannerType === 'PRODUCT') {
        return !!data.productId && !data.externalUrl;
    } else {
        return !!data.externalUrl && !data.productId;
    }
}, {
    message: 'Para PRODUCT, productId é obrigatório e externalUrl não pode ser definido. Para EXTERNAL, externalUrl é obrigatório e productId não pode ser definido.'
}).refine((data) => {
    // Para EXTERNAL, imageDesktop é obrigatório
    if (data.bannerType === 'EXTERNAL') {
        return !!data.imageDesktop;
    }
    // Para PRODUCT, imageDesktop é opcional (pode usar imagem do produto)
    return true;
}, {
    message: 'imageDesktop é obrigatório para banners do tipo EXTERNAL',
    path: ['imageDesktop']
});

const updateHeroProductSchema = z.object({
    bannerType: z.enum(['PRODUCT', 'EXTERNAL']).optional(),
    productId: z.number().int().positive().nullable().optional(),
    externalUrl: z.string().url().nullable().optional(),
    imageDesktop: z.union([z.string().min(1), z.literal('')]).optional().transform(val => val === '' ? undefined : val),
    imageMobile: z.union([z.string().min(1), z.literal('')]).optional().transform(val => val === '' ? undefined : val),
    displayOrder: z.number().int().min(0).optional(),
    displayDuration: z.number().int().min(1).max(60).optional(),
    active: z.boolean().optional()
});

const updateOrderSchema = z.object({
    updates: z.array(z.object({
        id: z.number().int().positive(),
        displayOrder: z.number().int().min(0)
    })).min(1)
});

export const heroProductController = {
    async create(req: Request, res: Response) {
        try {
            const data = createHeroProductSchema.parse(req.body);
            
            // Verificar se o produto existe (se for tipo PRODUCT)
            if (data.bannerType === 'PRODUCT' && data.productId) {
                const product = await productService.findById(data.productId);
                if (!product) {
                    return res.status(400).json({ message: 'Produto não encontrado' });
                }
            }

            const id = await heroProductService.create(data);
            res.status(201).json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Erro de validação Zod:', error.issues);
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                console.error('Erro ao criar banner:', error.message);
                if (error.message.includes('já está em destaque') || 
                    error.message.includes('obrigatório') ||
                    error.message.includes('não pode ser definido')) {
                    return res.status(400).json({ message: error.message });
                }
                // Retornar mensagem de erro mais específica
                return res.status(500).json({ message: `Erro ao criar banner: ${error.message}` });
            }
            console.error('Erro desconhecido:', error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            const heroProduct = await heroProductService.findById(id);
            if (!heroProduct) {
                return res.status(404).json({ message: 'Banner não encontrado' });
            }

            const data = updateHeroProductSchema.parse(req.body);
            
            // Determinar bannerType (usar o atual se não foi atualizado)
            const bannerType = data.bannerType !== undefined ? data.bannerType : heroProduct.bannerType;

            // Validar regras baseadas no tipo
            if (bannerType === 'PRODUCT') {
                const productId = data.productId !== undefined ? data.productId : heroProduct.productId;
                if (!productId) {
                    return res.status(400).json({ message: 'productId é obrigatório para banners do tipo PRODUCT' });
                }
                if (data.externalUrl !== undefined && data.externalUrl !== null) {
                    return res.status(400).json({ message: 'externalUrl não pode ser definido para banners do tipo PRODUCT' });
                }
                
                // Verificar se o produto existe
                const product = await productService.findById(productId);
                if (!product) {
                    return res.status(400).json({ message: 'Produto não encontrado' });
                }
            } else if (bannerType === 'EXTERNAL') {
                const externalUrl = data.externalUrl !== undefined ? data.externalUrl : heroProduct.externalUrl;
                if (!externalUrl) {
                    return res.status(400).json({ message: 'externalUrl é obrigatório para banners do tipo EXTERNAL' });
                }
                if (data.productId !== undefined && data.productId !== null) {
                    return res.status(400).json({ message: 'productId não pode ser definido para banners do tipo EXTERNAL' });
                }
            }

            await heroProductService.update(id, data);
            res.json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message.includes('já está em destaque') || 
                    error.message.includes('obrigatório') ||
                    error.message.includes('não pode ser definido')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            const heroProduct = await heroProductService.findById(id);
            if (!heroProduct) {
                return res.status(404).json({ message: 'Banner não encontrado' });
            }

            await heroProductService.delete(id);
            res.json({ success: true, id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            const heroProduct = await heroProductService.findById(id);
            if (!heroProduct) {
                return res.status(404).json({ message: 'Banner não encontrado' });
            }

            res.json(heroProduct);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    },

    async getAll(req: Request, res: Response) {
        try {
            const heroProducts = await heroProductService.findAll();
            res.json(heroProducts);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    },

    async updateOrder(req: Request, res: Response) {
        try {
            const data = updateOrderSchema.parse(req.body);
            await heroProductService.updateOrder(data.updates);
            res.json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    },

    // Endpoint público para buscar produtos em destaque (respeitando regras de lotes)
    async getActiveForDisplay(req: Request, res: Response) {
        try {
            // Buscar agencyId do query parameter (opcional)
            const agencyId = req.query.agencyId 
                ? parseInt(req.query.agencyId as string)
                : undefined;

            const products = await heroProductService.findActiveForDisplay(agencyId);
            res.json(products);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    }
};
