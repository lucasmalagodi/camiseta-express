"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchController = void 0;
const zod_1 = require("zod");
const branchService_1 = require("../services/branchService");
const createBranchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
});
const updateBranchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório').optional(),
});
exports.branchController = {
    async getAll(req, res) {
        try {
            const branches = await branchService_1.branchService.findAll();
            res.json({ data: branches, total: branches.length });
        }
        catch (error) {
            console.error('Error fetching branches:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const branch = await branchService_1.branchService.findById(id);
            if (!branch) {
                return res.status(404).json({ message: 'Branch not found' });
            }
            res.json(branch);
        }
        catch (error) {
            console.error('Error fetching branch:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async create(req, res) {
        try {
            const data = createBranchSchema.parse(req.body);
            const id = await branchService_1.branchService.create(data);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const data = updateBranchSchema.parse(req.body);
            await branchService_1.branchService.update(id, data);
            res.json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            await branchService_1.branchService.delete(id);
            res.json({ success: true, id });
        }
        catch (error) {
            console.error('Error deleting branch:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getUniqueBranchNames(req, res) {
        try {
            const names = await branchService_1.branchService.getUniqueBranchNames();
            res.json({ data: names, total: names.length });
        }
        catch (error) {
            console.error('Error fetching unique branch names:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
};
