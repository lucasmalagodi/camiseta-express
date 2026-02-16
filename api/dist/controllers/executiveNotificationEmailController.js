"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executiveNotificationEmailController = void 0;
const zod_1 = require("zod");
const executiveNotificationEmailService_1 = require("../services/executiveNotificationEmailService");
const createExecutiveNotificationEmailSchema = zod_1.z.object({
    executiveId: zod_1.z.number().int().positive('ID do executivo é obrigatório'),
    email: zod_1.z.string().email('Email inválido'),
});
const updateExecutiveNotificationEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido').optional(),
    active: zod_1.z.boolean().optional(),
});
exports.executiveNotificationEmailController = {
    async getByExecutiveId(req, res) {
        try {
            const executiveId = parseInt(req.params.executiveId);
            if (isNaN(executiveId)) {
                return res.status(400).json({ message: 'Invalid executive ID' });
            }
            const emails = await executiveNotificationEmailService_1.executiveNotificationEmailService.findByExecutiveId(executiveId);
            res.json({ data: emails, total: emails.length });
        }
        catch (error) {
            console.error('Error fetching executive notification emails:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const email = await executiveNotificationEmailService_1.executiveNotificationEmailService.findById(id);
            if (!email) {
                return res.status(404).json({ message: 'Executive notification email not found' });
            }
            res.json(email);
        }
        catch (error) {
            console.error('Error fetching executive notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async create(req, res) {
        try {
            const data = createExecutiveNotificationEmailSchema.parse(req.body);
            const id = await executiveNotificationEmailService_1.executiveNotificationEmailService.create(data);
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
            console.error('Error creating executive notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const data = updateExecutiveNotificationEmailSchema.parse(req.body);
            await executiveNotificationEmailService_1.executiveNotificationEmailService.update(id, data);
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
            console.error('Error updating executive notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            await executiveNotificationEmailService_1.executiveNotificationEmailService.delete(id);
            res.json({ success: true, id });
        }
        catch (error) {
            console.error('Error deleting executive notification email:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
};
