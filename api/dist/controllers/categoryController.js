"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryController = void 0;
const zod_1 = require("zod");
const categoryService_1 = require("../services/categoryService");
const createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1)
});
const updateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional()
});
exports.categoryController = {
    async create(req, res) {
        try {
            const data = createCategorySchema.parse(req.body);
            const id = await categoryService_1.categoryService.create(data);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input' });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const data = updateCategorySchema.parse(req.body);
            const category = await categoryService_1.categoryService.findById(id);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            await categoryService_1.categoryService.update(id, data);
            res.json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input' });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const category = await categoryService_1.categoryService.findById(id);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            await categoryService_1.categoryService.softDelete(id);
            res.json({ success: true, id });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const category = await categoryService_1.categoryService.findById(id);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            res.json(category);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getAll(req, res) {
        try {
            const categories = await categoryService_1.categoryService.findAll();
            res.json({ data: categories, total: categories.length });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
