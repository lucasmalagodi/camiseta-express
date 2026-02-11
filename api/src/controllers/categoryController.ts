import { Request, Response } from 'express';
import { z } from 'zod';
import { categoryService } from '../services/categoryService';

const createCategorySchema = z.object({
    name: z.string().min(1)
});

const updateCategorySchema = z.object({
    name: z.string().min(1).optional()
});

export const categoryController = {
    async create(req: Request, res: Response) {
        try {
            const data = createCategorySchema.parse(req.body);
            const id = await categoryService.create(data);
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
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const data = updateCategorySchema.parse(req.body);
            const category = await categoryService.findById(id);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }

            await categoryService.update(id, data);
            res.json({ success: true, id });
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
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const category = await categoryService.findById(id);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }

            await categoryService.softDelete(id);
            res.json({ success: true, id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const category = await categoryService.findById(id);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }

            res.json(category);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAll(req: Request, res: Response) {
        try {
            const categories = await categoryService.findAll();
            res.json({ data: categories, total: categories.length });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
