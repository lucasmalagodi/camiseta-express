import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Criar diretório de uploads se não existir
// Em desenvolvimento: fts/api/src -> fts/src/assets/product (2 níveis acima, depois entrar em src/assets/product)
// Em produção: fts/api/dist -> fts/src/assets/product (2 níveis acima, depois entrar em src/assets/product)
// No Docker: /src/assets/product (mapeado diretamente do volume)
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

// Garantir que todas as pastas existam
if (!fs.existsSync(baseAssetsPath)) {
    fs.mkdirSync(baseAssetsPath, { recursive: true });
    console.log('✅ Created base assets directory:', baseAssetsPath);
}

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created product uploads directory:', uploadsDir);
}

// Configuração do storage
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        try {
            // Garantir que a pasta base exista
            if (!fs.existsSync(baseAssetsPath)) {
                fs.mkdirSync(baseAssetsPath, { recursive: true });
                console.log('✅ Created base assets directory in multer:', baseAssetsPath);
            }
            
            // Garantir que a pasta product exista
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
                console.log('✅ Created product uploads directory in multer:', uploadsDir);
            }
            
            // Usar diretório temporário primeiro, depois moveremos no controller
            const tempDir = path.join(uploadsDir, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
                console.log('✅ Created temp directory in multer:', tempDir);
            }
            cb(null, tempDir);
        } catch (error) {
            console.error('❌ Error creating directories in multer:', error);
            cb(error as Error, '');
        }
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // Gerar nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// Filtro de tipos de arquivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não permitido. Apenas imagens são aceitas.'));
    }
};

// Configuração do multer
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
