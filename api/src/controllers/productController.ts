import { Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';

const variantSchema = z.object({
    model: z.enum(['MASCULINO', 'FEMININO', 'UNISEX']),
    size: z.string().min(1),
    stock: z.number().int().min(0)
});

const createProductSchema = z.object({
    categoryId: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string(),
    quantity: z.number().int().min(0).optional(),
    variants: z.array(variantSchema).optional()
});

const updateProductSchema = z.object({
    categoryId: z.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    quantity: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    variants: z.array(variantSchema).optional()
});

export const productController = {
    async create(req: Request, res: Response) {
        try {
            const data = createProductSchema.parse(req.body);
            
            const category = await categoryService.findById(data.categoryId);
            if (!category) {
                return res.status(400).json({ message: 'Category not found' });
            }

            const id = await productService.create(data);
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
            const id = parseInt(req.params.id as string, 10);
            if (Number.isNaN(id) || id < 1) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            // Log para debug
            console.log('Update product request:', { id, body: req.body });

            const parsedData = updateProductSchema.parse(req.body);
            
            // Converter active de boolean para 1 ou 0 antes de passar para o service
            const data: any = { ...parsedData };
            if ('active' in parsedData && parsedData.active !== undefined) {
                data.active = parsedData.active ? 1 : 0;
            }
            
            // Log após parse e conversão
            console.log('Parsed data:', parsedData);
            console.log('Data to update (with active as number):', data);

            const product = await productService.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            if (data.categoryId) {
                const category = await categoryService.findById(data.categoryId);
                if (!category) {
                    return res.status(400).json({ message: 'Category not found' });
                }
            }

            await productService.update(id, data);
            
            // Verificar se foi atualizado
            const updatedProduct = await productService.findById(id);
            console.log('Product after update:', updatedProduct);
            
            res.json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Zod validation error:', error);
                return res.status(400).json({ message: 'Invalid input', errors: error });
            }
            console.error('Update product error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (Number.isNaN(id) || id < 1) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const product = await productService.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            await productService.softDelete(id);
            res.json({ success: true, id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (Number.isNaN(id) || id < 1) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const product = await productService.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            res.json(product);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAll(req: Request, res: Response) {
        try {
            const filters: any = {};
            
            if (req.query.categoryId !== undefined && req.query.categoryId !== '') {
                const categoryId = parseInt(req.query.categoryId as string, 10);
                if (Number.isNaN(categoryId) || categoryId < 1) {
                    return res.status(400).json({ message: 'Invalid categoryId filter' });
                }
                filters.categoryId = categoryId;
            }

            if (req.query.active !== undefined) {
                filters.active = req.query.active === 'true';
            }

            if (req.query.name) {
                filters.name = req.query.name as string;
            }

            // Verificar se deve retornar com detalhes (imagens e preços)
            const withDetails = req.query.withDetails === 'true';
            
            let agencyId: number | undefined;
            if (req.query.agencyId !== undefined && req.query.agencyId !== '') {
                const parsed = parseInt(req.query.agencyId as string, 10);
                if (Number.isNaN(parsed) || parsed < 1) {
                    return res.status(400).json({ message: 'Invalid agencyId' });
                }
                agencyId = parsed;
            }

            if (withDetails) {
                const result = await productService.findAllWithDetails(
                    Object.keys(filters).length > 0 ? filters : undefined,
                    agencyId
                );
                res.json(result);
            } else {
                const result = await productService.findAll(Object.keys(filters).length > 0 ? filters : undefined);
                res.json(result);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getByIdWithDetails(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (Number.isNaN(id) || id < 1) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            let agencyId: number | undefined;
            if (req.query.agencyId !== undefined && req.query.agencyId !== '') {
                const parsed = parseInt(req.query.agencyId as string, 10);
                if (Number.isNaN(parsed) || parsed < 1) {
                    return res.status(400).json({ message: 'Invalid agencyId' });
                }
                agencyId = parsed;
            }

            const product = await productService.findByIdWithDetails(id, agencyId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Não expor produtos inativos para o público (segurança + consistência)
            if (!product.active) {
                return res.status(404).json({ message: 'Product not found' });
            }

            res.json(product);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
