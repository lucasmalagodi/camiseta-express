"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productController = void 0;
const zod_1 = require("zod");
const productService_1 = require("../services/productService");
const categoryService_1 = require("../services/categoryService");
const variantSchema = zod_1.z.object({
    model: zod_1.z.enum(['MASCULINO', 'FEMININO', 'UNISEX']),
    size: zod_1.z.string().min(1),
    stock: zod_1.z.number().int().min(0)
});
const createProductSchema = zod_1.z.object({
    categoryId: zod_1.z.number().int().positive(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    quantity: zod_1.z.number().int().min(0).optional(),
    variants: zod_1.z.array(variantSchema).optional()
});
const updateProductSchema = zod_1.z.object({
    categoryId: zod_1.z.number().int().positive().optional(),
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    quantity: zod_1.z.number().int().min(0).optional(),
    active: zod_1.z.boolean().optional(),
    variants: zod_1.z.array(variantSchema).optional()
});
exports.productController = {
    async create(req, res) {
        try {
            const data = createProductSchema.parse(req.body);
            const category = await categoryService_1.categoryService.findById(data.categoryId);
            if (!category) {
                return res.status(400).json({ message: 'Category not found' });
            }
            const id = await productService_1.productService.create(data);
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
            // Log para debug
            console.log('Update product request:', { id, body: req.body });
            const parsedData = updateProductSchema.parse(req.body);
            // Converter active de boolean para 1 ou 0 antes de passar para o service
            const data = { ...parsedData };
            if ('active' in parsedData && parsedData.active !== undefined) {
                data.active = parsedData.active ? 1 : 0;
            }
            // Log após parse e conversão
            console.log('Parsed data:', parsedData);
            console.log('Data to update (with active as number):', data);
            const product = await productService_1.productService.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            if (data.categoryId) {
                const category = await categoryService_1.categoryService.findById(data.categoryId);
                if (!category) {
                    return res.status(400).json({ message: 'Category not found' });
                }
            }
            await productService_1.productService.update(id, data);
            // Verificar se foi atualizado
            const updatedProduct = await productService_1.productService.findById(id);
            console.log('Product after update:', updatedProduct);
            res.json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                console.error('Zod validation error:', error);
                return res.status(400).json({ message: 'Invalid input', errors: error });
            }
            console.error('Update product error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const product = await productService_1.productService.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            await productService_1.productService.softDelete(id);
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
            const product = await productService_1.productService.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            res.json(product);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getAll(req, res) {
        try {
            const filters = {};
            if (req.query.categoryId) {
                filters.categoryId = parseInt(req.query.categoryId);
                if (isNaN(filters.categoryId)) {
                    return res.status(400).json({ message: 'Invalid categoryId filter' });
                }
            }
            if (req.query.active !== undefined) {
                filters.active = req.query.active === 'true';
            }
            if (req.query.name) {
                filters.name = req.query.name;
            }
            // Verificar se deve retornar com detalhes (imagens e preços)
            const withDetails = req.query.withDetails === 'true';
            // Buscar agencyId do query parameter (opcional)
            const agencyId = req.query.agencyId
                ? parseInt(req.query.agencyId)
                : undefined;
            if (withDetails) {
                const result = await productService_1.productService.findAllWithDetails(Object.keys(filters).length > 0 ? filters : undefined, agencyId);
                res.json(result);
            }
            else {
                const result = await productService_1.productService.findAll(Object.keys(filters).length > 0 ? filters : undefined);
                res.json(result);
            }
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getByIdWithDetails(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            // Buscar agencyId do query parameter (opcional)
            const agencyId = req.query.agencyId
                ? parseInt(req.query.agencyId)
                : undefined;
            const product = await productService_1.productService.findByIdWithDetails(id, agencyId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            res.json(product);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
