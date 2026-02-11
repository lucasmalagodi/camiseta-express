import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';

export const uploadController = {
    async uploadProductImage(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.id as string);
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid product ID' });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            // Buscar produto para obter categoria
            const product = await productService.findById(productId);
            if (!product) {
                // Limpar arquivo temporário se produto não encontrado
                if (req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({ message: 'Product not found' });
            }

            // Buscar categoria para obter nome
            const category = await categoryService.findById(product.categoryId);
            if (!category) {
                // Limpar arquivo temporário se categoria não encontrada
                if (req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({ message: 'Category not found' });
            }

            // Criar diretório da categoria se não existir
            const categoryName = category.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            
            // Função helper para garantir que o caminho base exista
            const getBaseAssetsPath = (): string => {
                // Em Docker/produção, sempre usar /src/assets (mapeado para /var/www/ancdcampanha/fts/src/assets no servidor)
                // Em desenvolvimento local, usar caminho relativo
                const dockerPath = '/src/assets';
                const devPath = path.resolve(__dirname, '../../src/assets');
                
                // Verificar se estamos em Docker (caminho /src/assets existe ou pode ser criado)
                // Priorizar sempre o caminho do Docker em produção
                if (process.env.NODE_ENV === 'production' || fs.existsSync(dockerPath)) {
                    try {
                        if (!fs.existsSync(dockerPath)) {
                            fs.mkdirSync(dockerPath, { recursive: true });
                            console.log('✅ Created Docker assets directory:', dockerPath);
                        } else {
                            console.log('✅ Using Docker assets path:', dockerPath);
                        }
                        return dockerPath;
                    } catch (error) {
                        console.error('❌ Error with Docker path, trying dev path:', error);
                    }
                }
                
                // Fallback para desenvolvimento local
                if (fs.existsSync(devPath)) {
                    console.log('✅ Using dev assets path:', devPath);
                    return devPath;
                }
                
                // Criar caminho de desenvolvimento se não existir
                try {
                    fs.mkdirSync(devPath, { recursive: true });
                    console.log('✅ Created dev assets directory:', devPath);
                    return devPath;
                } catch (error) {
                    console.error('❌ Error creating dev path, using Docker path as fallback:', error);
                    // Último recurso: tentar criar /src/assets
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
            const uploadsDir = path.join(baseAssetsPath, 'product');
            const categoryDir = path.join(uploadsDir, categoryName);
            
            // Garantir que todas as pastas existam (recursive cria todas as intermediárias)
            if (!fs.existsSync(baseAssetsPath)) {
                fs.mkdirSync(baseAssetsPath, { recursive: true });
                console.log('✅ Created base assets directory:', baseAssetsPath);
            }
            
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
                console.log('✅ Created product uploads directory:', uploadsDir);
            }
            
            if (!fs.existsSync(categoryDir)) {
                fs.mkdirSync(categoryDir, { recursive: true });
                console.log('✅ Created category directory:', categoryDir);
            }

            // Mover arquivo do diretório temp para o diretório da categoria
            const finalPath = path.join(categoryDir, req.file.filename);
            fs.renameSync(req.file.path, finalPath);

            // Verificar se o arquivo foi movido corretamente
            if (!fs.existsSync(finalPath)) {
                throw new Error('Failed to move uploaded file');
            }

            console.log('✅ File uploaded successfully:', {
                originalPath: req.file.path,
                finalPath: finalPath,
                categoryName: categoryName,
                filename: req.file.filename
            });

            // Construir caminho relativo
            // O nginx serve de /var/www/ancdcampanha/fts, então /src/assets/product/... 
            // precisa ser acessível como /src/assets/product/...
            // Em Docker, sempre usar /src/assets (mapeado para o servidor)
            // Em dev, usar /assets/product/...
            let relativePath: string;
            if (baseAssetsPath === '/src/assets' || process.env.NODE_ENV === 'production') {
                // Em produção/Docker, o caminho é /src/assets/product/...
                relativePath = `/src/assets/product/${categoryName}/${req.file.filename}`;
            } else {
                // Em desenvolvimento local, usar /assets/product/...
                relativePath = `/assets/product/${categoryName}/${req.file.filename}`;
            }

            console.log('📁 File path info:', {
                baseAssetsPath,
                finalPath,
                relativePath,
                categoryName,
                filename: req.file.filename
            });

            res.json({
                success: true,
                path: relativePath,
                name: req.file.originalname,
                filename: req.file.filename
            });
        } catch (error) {
            // Limpar arquivo temporário em caso de erro
            if (req.file && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Error deleting temp file:', unlinkError);
                }
            }
            console.error('Error uploading product image:', error);
            res.status(500).json({ message: 'Erro ao fazer upload da imagem' });
        }
    },

    async uploadBannerImage(req: Request, res: Response) {
        try {
            const imageType = req.params.type as string; // 'desktop' ou 'mobile'
            
            if (!['desktop', 'mobile'].includes(imageType)) {
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ message: 'Tipo de imagem inválido. Use "desktop" ou "mobile"' });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'Nenhum arquivo enviado' });
            }

            // Função helper para garantir que o caminho base exista
            const getBaseAssetsPath = (): string => {
                const dockerPath = '/src/assets';
                const devPath = path.resolve(__dirname, '../../src/assets');
                
                if (process.env.NODE_ENV === 'production' || fs.existsSync(dockerPath)) {
                    try {
                        if (!fs.existsSync(dockerPath)) {
                            fs.mkdirSync(dockerPath, { recursive: true });
                        }
                        return dockerPath;
                    } catch (error) {
                        console.error('Error with Docker path, trying dev path:', error);
                    }
                }
                
                if (fs.existsSync(devPath)) {
                    return devPath;
                }
                
                try {
                    fs.mkdirSync(devPath, { recursive: true });
                    return devPath;
                } catch (error) {
                    console.error('Error creating dev path, using Docker path as fallback:', error);
                    try {
                        fs.mkdirSync(dockerPath, { recursive: true });
                        return dockerPath;
                    } catch (dockerError) {
                        console.error('Failed to create any assets directory:', dockerError);
                        throw new Error('Failed to create assets directory');
                    }
                }
            };

            const baseAssetsPath = getBaseAssetsPath();
            const bannerDir = path.join(baseAssetsPath, 'banner', imageType);

            // Criar diretório se não existir
            if (!fs.existsSync(bannerDir)) {
                fs.mkdirSync(bannerDir, { recursive: true });
                console.log('✅ Created banner directory:', bannerDir);
            }

            // Mover arquivo do diretório temporário para o diretório final
            const finalPath = path.join(bannerDir, req.file.filename);
            fs.renameSync(req.file.path, finalPath);

            if (!fs.existsSync(finalPath)) {
                throw new Error('Failed to move uploaded file');
            }

            console.log('✅ Banner image uploaded successfully:', {
                originalPath: req.file.path,
                finalPath: finalPath,
                imageType: imageType,
                filename: req.file.filename
            });

            // Construir caminho relativo
            let relativePath: string;
            if (baseAssetsPath === '/src/assets' || process.env.NODE_ENV === 'production') {
                relativePath = `/src/assets/banner/${imageType}/${req.file.filename}`;
            } else {
                relativePath = `/assets/banner/${imageType}/${req.file.filename}`;
            }

            res.json({
                success: true,
                path: relativePath,
                name: req.file.originalname,
                filename: req.file.filename,
                type: imageType
            });
        } catch (error) {
            // Limpar arquivo temporário em caso de erro
            if (req.file && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Error deleting temp file:', unlinkError);
                }
            }
            console.error('Error uploading banner image:', error);
            res.status(500).json({ message: 'Erro ao fazer upload da imagem do banner' });
        }
    }
};
