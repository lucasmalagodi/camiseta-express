import { Request, Response } from 'express';
import { z } from 'zod';
import { executiveService } from '../services/executiveService';

const createExecutiveSchema = z.object({
    code: z.string().min(1, 'Código é obrigatório'),
    email: z.string().email('Email inválido'),
    name: z.string().optional(),
    branchId: z.number().int().positive().nullable().optional(),
});

const updateExecutiveSchema = z.object({
    code: z.string().min(1, 'Código é obrigatório').optional(),
    email: z.string().email('Email inválido').optional(),
    name: z.string().optional(),
    branchId: z.number().int().positive().nullable().optional(),
    active: z.boolean().optional(),
});

export const executiveController = {
    async getAll(req: Request, res: Response) {
        try {
            const executives = await executiveService.findAll();
            res.json({ data: executives, total: executives.length });
        } catch (error) {
            console.error('Error fetching executives:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getActive(req: Request, res: Response) {
        try {
            const executives = await executiveService.findActive();
            res.json({ data: executives, total: executives.length });
        } catch (error) {
            console.error('Error fetching active executives:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const executive = await executiveService.findById(id);
            if (!executive) {
                return res.status(404).json({ message: 'Executive not found' });
            }

            res.json(executive);
        } catch (error) {
            console.error('Error fetching executive:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createExecutiveSchema.parse(req.body);
            const id = await executiveService.create(data);
            res.status(201).json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message.includes('já cadastrado')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error('Error creating executive:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const data = updateExecutiveSchema.parse(req.body);
            await executiveService.update(id, data);
            res.json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message.includes('já cadastrado')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error('Error updating executive:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            await executiveService.delete(id);
            res.json({ success: true, id });
        } catch (error) {
            console.error('Error deleting executive:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getUniqueExecutiveNames(req: Request, res: Response) {
        try {
            const names = await executiveService.getUniqueExecutiveNames();
            res.json({ data: names, total: names.length });
        } catch (error) {
            console.error('Error fetching unique executive names:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
};
