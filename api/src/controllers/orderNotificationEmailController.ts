import { Request, Response } from 'express';
import { z } from 'zod';
import { orderNotificationEmailService } from '../services/orderNotificationEmailService';

const createEmailSchema = z.object({
    email: z.string().email('Email inválido'),
});

const updateEmailSchema = z.object({
    email: z.string().email('Email inválido').optional(),
    active: z.boolean().optional(),
});

export const orderNotificationEmailController = {
    async getAll(req: Request, res: Response) {
        try {
            const emails = await orderNotificationEmailService.findAll();
            res.json({ data: emails, total: emails.length });
        } catch (error) {
            console.error('Error fetching notification emails:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getActive(req: Request, res: Response) {
        try {
            const emails = await orderNotificationEmailService.findActive();
            res.json({ data: emails, total: emails.length });
        } catch (error) {
            console.error('Error fetching active notification emails:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const email = await orderNotificationEmailService.findById(id);
            if (!email) {
                return res.status(404).json({ message: 'Email not found' });
            }

            res.json(email);
        } catch (error) {
            console.error('Error fetching notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createEmailSchema.parse(req.body);
            const id = await orderNotificationEmailService.create(data);
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
            console.error('Error creating notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const data = updateEmailSchema.parse(req.body);
            await orderNotificationEmailService.update(id, data);
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
            console.error('Error updating notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            await orderNotificationEmailService.delete(id);
            res.json({ success: true, id });
        } catch (error) {
            console.error('Error deleting notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
};
