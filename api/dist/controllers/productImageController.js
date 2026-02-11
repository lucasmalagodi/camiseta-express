"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productImageController = void 0;
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const productImageService_1 = require("../services/productImageService");
const productService_1 = require("../services/productService");
const createProductImageSchema = zod_1.z.object({
    path: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1)
});
const updateProductImageSchema = zod_1.z.object({
    path: zod_1.z.string().min(1).optional(),
    name: zod_1.z.string().min(1).optional(),
    active: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional(),
    favorite: zod_1.z.boolean().optional()
});
const updateOrderSchema = zod_1.z.object({
    updates: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.number().int().positive(),
        displayOrder: zod_1.z.number().int().min(0)
    })).min(1)
});
exports.productImageController = {
    async create(req, res) {
        try {
            const productId = parseInt(req.params.id);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const data = createProductImageSchema.parse(req.body);
            const id = await productImageService_1.productImageService.create(productId, data);
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
            const productId = parseInt(req.params.id);
            const imageId = parseInt(req.params.imageId);
            if (isNaN(productId) || isNaN(imageId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const image = await productImageService_1.productImageService.findById(productId, imageId);
            if (!image) {
                return res.status(404).json({ message: 'Product image not found' });
            }
            const data = updateProductImageSchema.parse(req.body);
            await productImageService_1.productImageService.update(productId, imageId, data);
            res.json({ success: true, id: imageId });
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
            const productId = parseInt(req.params.id);
            const imageId = parseInt(req.params.imageId);
            if (isNaN(productId) || isNaN(imageId)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const image = await productImageService_1.productImageService.findById(productId, imageId);
            if (!image) {
                return res.status(404).json({ message: 'Product image not found' });
            }
            // Deletar arquivo físico
            // Construir caminho completo do arquivo
            const imagePath = image.path;
            let filePath;
            // Função helper para obter o caminho base
            const getBaseAssetsPath = () => {
                if (process.env.NODE_ENV === 'production' || fs_1.default.existsSync('/src/assets')) {
                    return '/src/assets';
                }
                return path_1.default.resolve(__dirname, '../../src/assets');
            };
            const baseAssetsPath = getBaseAssetsPath();
            // Verificar se é caminho absoluto ou relativo
            if (imagePath.startsWith('/src/assets')) {
                // Caminho relativo: /src/assets/product/{categoria}/{arquivo}
                // Remover /src/assets do início
                const relativePath = imagePath.replace('/src/assets', '');
                filePath = path_1.default.join(baseAssetsPath, relativePath);
            }
            else if (imagePath.startsWith('/assets')) {
                // Caminho relativo: /assets/product/{categoria}/{arquivo} (dev)
                // Remover /assets do início
                const relativePath = imagePath.replace('/assets', '');
                filePath = path_1.default.join(baseAssetsPath, relativePath);
            }
            else if (imagePath.startsWith('http')) {
                // URL externa, não deletar
                filePath = '';
            }
            else {
                // Caminho relativo ou absoluto direto
                filePath = path_1.default.isAbsolute(imagePath)
                    ? imagePath
                    : path_1.default.join(baseAssetsPath, imagePath);
            }
            // Deletar arquivo se existir
            if (filePath && fs_1.default.existsSync(filePath)) {
                try {
                    fs_1.default.unlinkSync(filePath);
                    console.log('✅ Arquivo deletado:', filePath);
                }
                catch (fileError) {
                    console.error('⚠️ Erro ao deletar arquivo:', fileError);
                    // Continuar mesmo se não conseguir deletar o arquivo
                }
            }
            // Deletar do banco de dados (hard delete)
            await productImageService_1.productImageService.hardDelete(productId, imageId);
            res.json({ success: true, id: imageId });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getAll(req, res) {
        try {
            const productId = parseInt(req.params.id);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const images = await productImageService_1.productImageService.findAllByProductId(productId);
            res.json({ data: images, total: images.length });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async updateOrder(req, res) {
        try {
            const productId = parseInt(req.params.id);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }
            const product = await productService_1.productService.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            const data = updateOrderSchema.parse(req.body);
            await productImageService_1.productImageService.updateOrder(productId, data.updates);
            res.json({ success: true });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    }
};
