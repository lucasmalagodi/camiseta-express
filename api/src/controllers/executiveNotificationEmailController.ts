import { Request, Response } from 'express';
import { z } from 'zod';
import { executiveNotificationEmailService } from '../services/executiveNotificationEmailService';

const createExecutiveNotificationEmailSchema = z.object({
    executiveId: z.number().int().positive('ID do executivo é obrigatório'),
    email: z.string().email('Email inválido'),
});

const updateExecutiveNotificationEmailSchema = z.object({
    email: z.string().email('Email inválido').optional(),
    active: z.boolean().optional(),
});

export const executiveNotificationEmailController = {
    async getByExecutiveId(req: Request, res: Response) {
        try {
            const executiveId = parseInt(req.params.executiveId as string);
            if (isNaN(executiveId)) {
                return res.status(400).json({ message: 'Invalid executive ID' });
            }

            const emails = await executiveNotificationEmailService.findByExecutiveId(executiveId);
            res.json({ data: emails, total: emails.length });
        } catch (error) {
            console.error('Error fetching executive notification emails:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const email = await executiveNotificationEmailService.findById(id);
            if (!email) {
                return res.status(404).json({ message: 'Executive notification email not found' });
            }

            res.json(email);
        } catch (error) {
            console.error('Error fetching executive notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createExecutiveNotificationEmailSchema.parse(req.body);
            const id = await executiveNotificationEmailService.create(data);
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
            console.error('Error creating executive notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const data = updateExecutiveNotificationEmailSchema.parse(req.body);
            await executiveNotificationEmailService.update(id, data);
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
            console.error('Error updating executive notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            await executiveNotificationEmailService.delete(id);
            res.json({ success: true, id });
        } catch (error) {
            console.error('Error deleting executive notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
};
