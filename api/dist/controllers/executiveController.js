"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executiveController = void 0;
const zod_1 = require("zod");
const executiveService_1 = require("../services/executiveService");
const createExecutiveSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Código é obrigatório'),
    email: zod_1.z.string().email('Email inválido'),
    name: zod_1.z.string().optional(),
    branchId: zod_1.z.number().int().positive().nullable().optional(),
});
const updateExecutiveSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Código é obrigatório').optional(),
    email: zod_1.z.string().email('Email inválido').optional(),
    name: zod_1.z.string().optional(),
    branchId: zod_1.z.number().int().positive().nullable().optional(),
    active: zod_1.z.boolean().optional(),
});
exports.executiveController = {
    async getAll(req, res) {
        try {
            const executives = await executiveService_1.executiveService.findAll();
            res.json({ data: executives, total: executives.length });
        }
        catch (error) {
            console.error('Error fetching executives:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getActive(req, res) {
        try {
            const executives = await executiveService_1.executiveService.findActive();
            res.json({ data: executives, total: executives.length });
        }
        catch (error) {
            console.error('Error fetching active executives:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const executive = await executiveService_1.executiveService.findById(id);
            if (!executive) {
                return res.status(404).json({ message: 'Executive not found' });
            }
            res.json(executive);
        }
        catch (error) {
            console.error('Error fetching executive:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async create(req, res) {
        try {
            const data = createExecutiveSchema.parse(req.body);
            const id = await executiveService_1.executiveService.create(data);
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
            console.error('Error creating executive:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const data = updateExecutiveSchema.parse(req.body);
            await executiveService_1.executiveService.update(id, data);
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
            console.error('Error updating executive:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            await executiveService_1.executiveService.delete(id);
            res.json({ success: true, id });
        }
        catch (error) {
            console.error('Error deleting executive:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getUniqueExecutiveNames(req, res) {
        try {
            const names = await executiveService_1.executiveService.getUniqueExecutiveNames();
            res.json({ data: names, total: names.length });
        }
        catch (error) {
            console.error('Error fetching unique executive names:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
};
