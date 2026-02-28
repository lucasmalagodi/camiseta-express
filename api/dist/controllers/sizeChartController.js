"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sizeChartController = void 0;
const sizeChartService_1 = require("../services/sizeChartService");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
exports.sizeChartController = {
    async getAll(req, res) {
        try {
            const sizeCharts = await sizeChartService_1.sizeChartService.getAll();
            res.json(sizeCharts);
        }
        catch (error) {
            console.error('Erro ao buscar grades de tamanho:', error);
            res.status(500).json({ message: error.message || 'Erro ao buscar grades de tamanho' });
        }
    },
    async getByModel(req, res) {
        try {
            const model = req.params.model;
            if (!['MASCULINO', 'FEMININO', 'UNISEX'].includes(model)) {
                return res.status(400).json({ message: 'Modelo inválido. Use MASCULINO, FEMININO ou UNISEX' });
            }
            const sizeCharts = await sizeChartService_1.sizeChartService.getByModel(model);
            res.json(sizeCharts);
        }
        catch (error) {
            console.error('Erro ao buscar grade de tamanho por modelo:', error);
            res.status(500).json({ message: error.message || 'Erro ao buscar grade de tamanho' });
        }
    },
    async getById(req, res) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const sizeChart = await sizeChartService_1.sizeChartService.getById(id);
            res.json(sizeChart);
        }
        catch (error) {
            console.error('Erro ao buscar grade de tamanho:', error);
            res.status(404).json({ message: error.message || 'Grade de tamanho não encontrada' });
        }
    },
    async create(req, res) {
        try {
            const { name, description, model, measurements } = req.body;
            if (!name || !model) {
                return res.status(400).json({ message: 'Nome e modelo são obrigatórios' });
            }
            if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
                return res.status(400).json({ message: 'Pelo menos uma medida é obrigatória' });
            }
            const sizeChartId = await sizeChartService_1.sizeChartService.create({
                name,
                description,
                model,
                measurements,
            });
            res.status(201).json({ id: sizeChartId, message: 'Grade de tamanho criada com sucesso' });
        }
        catch (error) {
            console.error('Erro ao criar grade de tamanho:', error);
            res.status(500).json({ message: error.message || 'Erro ao criar grade de tamanho' });
        }
    },
    async update(req, res) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const { name, description, active, measurements } = req.body;
            await sizeChartService_1.sizeChartService.update(id, {
                name,
                description,
                active,
                measurements,
            });
            res.json({ message: 'Grade de tamanho atualizada com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar grade de tamanho:', error);
            res.status(500).json({ message: error.message || 'Erro ao atualizar grade de tamanho' });
        }
    },
    async delete(req, res) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            await sizeChartService_1.sizeChartService.delete(id);
            res.json({ message: 'Grade de tamanho excluída com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir grade de tamanho:', error);
            res.status(500).json({ message: error.message || 'Erro ao excluir grade de tamanho' });
        }
    },
    async uploadImage(req, res) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            if (!req.file) {
                return res.status(400).json({ message: 'Nenhuma imagem enviada' });
            }
            // Função helper para obter o caminho base dos assets (mesma lógica do uploadController)
            const getBaseAssetsPath = () => {
                const dockerPath = '/src/assets';
                const devPath = path_1.default.resolve(__dirname, '../../src/assets');
                if (process.env.NODE_ENV === 'production' || fs_1.default.existsSync(dockerPath)) {
                    try {
                        if (!fs_1.default.existsSync(dockerPath)) {
                            fs_1.default.mkdirSync(dockerPath, { recursive: true });
                            console.log('✅ Created Docker assets directory:', dockerPath);
                        }
                        return dockerPath;
                    }
                    catch (error) {
                        console.error('❌ Error with Docker path, trying dev path:', error);
                    }
                }
                if (fs_1.default.existsSync(devPath)) {
                    return devPath;
                }
                try {
                    fs_1.default.mkdirSync(devPath, { recursive: true });
                    return devPath;
                }
                catch (error) {
                    console.error('❌ Error creating dev path, using Docker path as fallback:', error);
                    try {
                        fs_1.default.mkdirSync(dockerPath, { recursive: true });
                        return dockerPath;
                    }
                    catch (dockerError) {
                        console.error('❌ Failed to create any assets directory:', dockerError);
                        throw new Error('Failed to create assets directory');
                    }
                }
            };
            const baseAssetsPath = getBaseAssetsPath();
            const sizeChartsDir = path_1.default.join(baseAssetsPath, 'size-charts');
            // Criar diretório se não existir
            if (!fs_1.default.existsSync(sizeChartsDir)) {
                fs_1.default.mkdirSync(sizeChartsDir, { recursive: true });
                console.log('✅ Created size-charts directory:', sizeChartsDir);
            }
            // Mover arquivo do temp para o diretório de size charts
            const fileExtension = path_1.default.extname(req.file.originalname);
            const fileName = `size-chart-${id}-${Date.now()}${fileExtension}`;
            const filePath = path_1.default.join(sizeChartsDir, fileName);
            // Verificar se o arquivo temporário existe antes de mover
            if (!fs_1.default.existsSync(req.file.path)) {
                throw new Error('Arquivo temporário não encontrado');
            }
            fs_1.default.renameSync(req.file.path, filePath);
            // Verificar se o arquivo foi movido corretamente
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error('Falha ao mover arquivo enviado');
            }
            console.log('✅ File uploaded successfully:', {
                originalPath: req.file.path,
                finalPath: filePath,
                filename: fileName
            });
            // Construir caminho relativo (mesma lógica do uploadController)
            let relativePath;
            if (baseAssetsPath === '/src/assets' || process.env.NODE_ENV === 'production') {
                // Em produção/Docker, o caminho é /src/assets/size-charts/...
                relativePath = `/src/assets/size-charts/${fileName}`;
            }
            else {
                // Em desenvolvimento local, usar /assets/size-charts/...
                relativePath = `/assets/size-charts/${fileName}`;
            }
            console.log('📁 File path info:', {
                baseAssetsPath,
                finalPath: filePath,
                relativePath,
                filename: fileName
            });
            // Salvar caminho relativo no banco
            await sizeChartService_1.sizeChartService.updateImagePath(id, relativePath);
            res.json({
                message: 'Imagem enviada com sucesso',
                imagePath: relativePath
            });
        }
        catch (error) {
            // Limpar arquivo temporário em caso de erro
            if (req.file && req.file.path && fs_1.default.existsSync(req.file.path)) {
                try {
                    fs_1.default.unlinkSync(req.file.path);
                }
                catch (cleanupError) {
                    console.error('Erro ao limpar arquivo temporário:', cleanupError);
                }
            }
            console.error('Erro ao fazer upload da imagem:', error);
            res.status(500).json({ message: error.message || 'Erro ao fazer upload da imagem' });
        }
    },
};
