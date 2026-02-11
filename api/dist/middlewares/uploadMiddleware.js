"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Criar diretório de uploads se não existir
// Em desenvolvimento: fts/api/src -> fts/src/assets/product (2 níveis acima, depois entrar em src/assets/product)
// Em produção: fts/api/dist -> fts/src/assets/product (2 níveis acima, depois entrar em src/assets/product)
// No Docker: /src/assets/product (mapeado diretamente do volume)
const getBaseAssetsPath = () => {
    // Em Docker/produção, sempre usar /src/assets (mapeado para /var/www/ancdcampanha/fts/src/assets no servidor)
    // Em desenvolvimento local, usar caminho relativo
    const dockerPath = '/src/assets';
    const devPath = path_1.default.resolve(__dirname, '../../src/assets');
    // Verificar se estamos em Docker (caminho /src/assets existe ou pode ser criado)
    // Priorizar sempre o caminho do Docker em produção
    if (process.env.NODE_ENV === 'production' || fs_1.default.existsSync(dockerPath)) {
        try {
            if (!fs_1.default.existsSync(dockerPath)) {
                fs_1.default.mkdirSync(dockerPath, { recursive: true });
                console.log('✅ Created Docker assets directory:', dockerPath);
            }
            else {
                console.log('✅ Using Docker assets path:', dockerPath);
            }
            return dockerPath;
        }
        catch (error) {
            console.error('❌ Error with Docker path, trying dev path:', error);
        }
    }
    // Fallback para desenvolvimento local
    if (fs_1.default.existsSync(devPath)) {
        console.log('✅ Using dev assets path:', devPath);
        return devPath;
    }
    // Criar caminho de desenvolvimento se não existir
    try {
        fs_1.default.mkdirSync(devPath, { recursive: true });
        console.log('✅ Created dev assets directory:', devPath);
        return devPath;
    }
    catch (error) {
        console.error('❌ Error creating dev path, using Docker path as fallback:', error);
        // Último recurso: tentar criar /src/assets
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
const uploadsDir = path_1.default.join(baseAssetsPath, 'product');
// Garantir que todas as pastas existam
if (!fs_1.default.existsSync(baseAssetsPath)) {
    fs_1.default.mkdirSync(baseAssetsPath, { recursive: true });
    console.log('✅ Created base assets directory:', baseAssetsPath);
}
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created product uploads directory:', uploadsDir);
}
// Configuração do storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        try {
            // Garantir que a pasta base exista
            if (!fs_1.default.existsSync(baseAssetsPath)) {
                fs_1.default.mkdirSync(baseAssetsPath, { recursive: true });
                console.log('✅ Created base assets directory in multer:', baseAssetsPath);
            }
            // Garantir que a pasta product exista
            if (!fs_1.default.existsSync(uploadsDir)) {
                fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                console.log('✅ Created product uploads directory in multer:', uploadsDir);
            }
            // Usar diretório temporário primeiro, depois moveremos no controller
            const tempDir = path_1.default.join(uploadsDir, 'temp');
            if (!fs_1.default.existsSync(tempDir)) {
                fs_1.default.mkdirSync(tempDir, { recursive: true });
                console.log('✅ Created temp directory in multer:', tempDir);
            }
            cb(null, tempDir);
        }
        catch (error) {
            console.error('❌ Error creating directories in multer:', error);
            cb(error, '');
        }
    },
    filename: (req, file, cb) => {
        // Gerar nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        const name = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});
// Filtro de tipos de arquivo permitidos
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Tipo de arquivo não permitido. Apenas imagens são aceitas.'));
    }
};
// Configuração do multer
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
