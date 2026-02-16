import { Request, Response } from 'express';
import { z } from 'zod';
import { branchService } from '../services/branchService';

const createBranchSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
});

const updateBranchSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
});

export const branchController = {
    async getAll(req: Request, res: Response) {
        try {
            const branches = await branchService.findAll();
            res.json({ data: branches, total: branches.length });
        } catch (error) {
            console.error('Error fetching branches:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const branch = await branchService.findById(id);
            if (!branch) {
                return res.status(404).json({ message: 'Branch not found' });
            }

            res.json(branch);
        } catch (error) {
            console.error('Error fetching branch:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createBranchSchema.parse(req.body);
            const id = await branchService.create(data);
            res.status(201).json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message.includes('já cadastrada')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error('Error creating branch:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const data = updateBranchSchema.parse(req.body);
            await branchService.update(id, data);
            res.json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message.includes('já cadastrada')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error('Error updating branch:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            await branchService.delete(id);
            res.json({ success: true, id });
        } catch (error) {
            console.error('Error deleting branch:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getUniqueBranchNames(req: Request, res: Response) {
        try {
            const names = await branchService.getUniqueBranchNames();
            res.json({ data: names, total: names.length });
        } catch (error) {
            console.error('Error fetching unique branch names:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
};
