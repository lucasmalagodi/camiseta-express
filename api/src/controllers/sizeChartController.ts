import { Request, Response } from 'express';
import { sizeChartService } from '../services/sizeChartService';
import path from 'path';
import fs from 'fs';

export const sizeChartController = {
    async getAll(req: Request, res: Response) {
        try {
            const sizeCharts = await sizeChartService.getAll();
            res.json(sizeCharts);
        } catch (error: any) {
            console.error('Erro ao buscar grades de tamanho:', error);
            res.status(500).json({ message: error.message || 'Erro ao buscar grades de tamanho' });
        }
    },

    async getByModel(req: Request, res: Response) {
        try {
            const model = req.params.model as 'MASCULINO' | 'FEMININO' | 'UNISEX';
            if (!['MASCULINO', 'FEMININO', 'UNISEX'].includes(model)) {
                return res.status(400).json({ message: 'Modelo inválido. Use MASCULINO, FEMININO ou UNISEX' });
            }

            const sizeCharts = await sizeChartService.getByModel(model);
            res.json(sizeCharts);
        } catch (error: any) {
            console.error('Erro ao buscar grade de tamanho por modelo:', error);
            res.status(500).json({ message: error.message || 'Erro ao buscar grade de tamanho' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            const sizeChart = await sizeChartService.getById(id);
            res.json(sizeChart);
        } catch (error: any) {
            console.error('Erro ao buscar grade de tamanho:', error);
            res.status(404).json({ message: error.message || 'Grade de tamanho não encontrada' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const { name, description, model, measurements } = req.body;

            if (!name || !model) {
                return res.status(400).json({ message: 'Nome e modelo são obrigatórios' });
            }

            if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
                return res.status(400).json({ message: 'Pelo menos uma medida é obrigatória' });
            }

            const sizeChartId = await sizeChartService.create({
                name,
                description,
                model,
                measurements,
            });

            res.status(201).json({ id: sizeChartId, message: 'Grade de tamanho criada com sucesso' });
        } catch (error: any) {
            console.error('Erro ao criar grade de tamanho:', error);
            res.status(500).json({ message: error.message || 'Erro ao criar grade de tamanho' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            const { name, description, active, measurements } = req.body;

            await sizeChartService.update(id, {
                name,
                description,
                active,
                measurements,
            });

            res.json({ message: 'Grade de tamanho atualizada com sucesso' });
        } catch (error: any) {
            console.error('Erro ao atualizar grade de tamanho:', error);
            res.status(500).json({ message: error.message || 'Erro ao atualizar grade de tamanho' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const id = parseInt(idParam);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            await sizeChartService.delete(id);
            res.json({ message: 'Grade de tamanho excluída com sucesso' });
        } catch (error: any) {
            console.error('Erro ao excluir grade de tamanho:', error);
            res.status(500).json({ message: error.message || 'Erro ao excluir grade de tamanho' });
        }
    },

    async uploadImage(req: Request, res: Response) {
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
            const getBaseAssetsPath = (): string => {
                const dockerPath = '/src/assets';
                const devPath = path.resolve(__dirname, '../../src/assets');
                
                if (process.env.NODE_ENV === 'production' || fs.existsSync(dockerPath)) {
                    try {
                        if (!fs.existsSync(dockerPath)) {
                            fs.mkdirSync(dockerPath, { recursive: true });
                            console.log('✅ Created Docker assets directory:', dockerPath);
                        }
                        return dockerPath;
                    } catch (error) {
                        console.error('❌ Error with Docker path, trying dev path:', error);
                    }
                }
                
                if (fs.existsSync(devPath)) {
                    return devPath;
                }
                
                try {
                    fs.mkdirSync(devPath, { recursive: true });
                    return devPath;
                } catch (error) {
                    console.error('❌ Error creating dev path, using Docker path as fallback:', error);
                    try {
                        fs.mkdirSync(dockerPath, { recursive: true });
                        return dockerPath;
                    } catch (dockerError) {
                        console.error('❌ Failed to create any assets directory:', dockerError);
                        throw new Error('Failed to create assets directory');
                    }
                }
            };

            const baseAssetsPath = getBaseAssetsPath();
            const sizeChartsDir = path.join(baseAssetsPath, 'size-charts');

            // Criar diretório se não existir
            if (!fs.existsSync(sizeChartsDir)) {
                fs.mkdirSync(sizeChartsDir, { recursive: true });
                console.log('✅ Created size-charts directory:', sizeChartsDir);
            }

            // Mover arquivo do temp para o diretório de size charts
            const fileExtension = path.extname(req.file.originalname);
            const fileName = `size-chart-${id}-${Date.now()}${fileExtension}`;
            const filePath = path.join(sizeChartsDir, fileName);

            // Verificar se o arquivo temporário existe antes de mover
            if (!fs.existsSync(req.file.path)) {
                throw new Error('Arquivo temporário não encontrado');
            }

            fs.renameSync(req.file.path, filePath);

            // Verificar se o arquivo foi movido corretamente
            if (!fs.existsSync(filePath)) {
                throw new Error('Falha ao mover arquivo enviado');
            }

            console.log('✅ File uploaded successfully:', {
                originalPath: req.file.path,
                finalPath: filePath,
                filename: fileName
            });

            // Construir caminho relativo (mesma lógica do uploadController)
            let relativePath: string;
            if (baseAssetsPath === '/src/assets' || process.env.NODE_ENV === 'production') {
                // Em produção/Docker, o caminho é /src/assets/size-charts/...
                relativePath = `/src/assets/size-charts/${fileName}`;
            } else {
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
            await sizeChartService.updateImagePath(id, relativePath);

            res.json({ 
                message: 'Imagem enviada com sucesso',
                imagePath: relativePath 
            });
        } catch (error: any) {
            // Limpar arquivo temporário em caso de erro
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (cleanupError) {
                    console.error('Erro ao limpar arquivo temporário:', cleanupError);
                }
            }
            console.error('Erro ao fazer upload da imagem:', error);
            res.status(500).json({ message: error.message || 'Erro ao fazer upload da imagem' });
        }
    },
};
