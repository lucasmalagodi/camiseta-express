"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderNotificationEmailController = void 0;
const zod_1 = require("zod");
const orderNotificationEmailService_1 = require("../services/orderNotificationEmailService");
const createEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
});
const updateEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido').optional(),
    active: zod_1.z.boolean().optional(),
});
exports.orderNotificationEmailController = {
    async getAll(req, res) {
        try {
            const emails = await orderNotificationEmailService_1.orderNotificationEmailService.findAll();
            res.json({ data: emails, total: emails.length });
        }
        catch (error) {
            console.error('Error fetching notification emails:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getActive(req, res) {
        try {
            const emails = await orderNotificationEmailService_1.orderNotificationEmailService.findActive();
            res.json({ data: emails, total: emails.length });
        }
        catch (error) {
            console.error('Error fetching active notification emails:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const email = await orderNotificationEmailService_1.orderNotificationEmailService.findById(id);
            if (!email) {
                return res.status(404).json({ message: 'Email not found' });
            }
            res.json(email);
        }
        catch (error) {
            console.error('Error fetching notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async create(req, res) {
        try {
            const data = createEmailSchema.parse(req.body);
            const id = await orderNotificationEmailService_1.orderNotificationEmailService.create(data);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const data = updateEmailSchema.parse(req.body);
            await orderNotificationEmailService_1.orderNotificationEmailService.update(id, data);
            res.json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            await orderNotificationEmailService_1.orderNotificationEmailService.delete(id);
            res.json({ success: true, id });
        }
        catch (error) {
            console.error('Error deleting notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
};
