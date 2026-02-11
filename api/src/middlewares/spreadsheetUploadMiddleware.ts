import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Criar diretório de uploads de planilhas
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
        try {
            fs.mkdirSync(dockerPath, { recursive: true });
            return dockerPath;
        } catch (dockerError) {
            throw new Error('Failed to create assets directory');
        }
    }
};

const baseAssetsPath = getBaseAssetsPath();
const spreadsheetsDir = path.join(baseAssetsPath, 'spreadsheets');

// Garantir que o diretório exista
if (!fs.existsSync(spreadsheetsDir)) {
    fs.mkdirSync(spreadsheetsDir, { recursive: true });
    console.log('✅ Created spreadsheets upload directory:', spreadsheetsDir);
}

// Configuração do storage
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        try {
            if (!fs.existsSync(spreadsheetsDir)) {
                fs.mkdirSync(spreadsheetsDir, { recursive: true });
            }
            cb(null, spreadsheetsDir);
        } catch (error) {
            console.error('❌ Error creating spreadsheets directory:', error);
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

// Filtro de tipos de arquivo permitidos (planilhas)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.xls', '.xlsx', '.xlsm'];
    const allowedMimes = [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
        'application/octet-stream' // Fallback para alguns navegadores com .xlsm
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    const isValidMime = allowedMimes.includes(file.mimetype) || file.mimetype === '';
    
    // Aceitar se extensão for válida (prioridade) OU mimetype for válido
    // Alguns navegadores não enviam mimetype correto para .xlsm, então confiamos na extensão
    if (isValidExtension) {
        cb(null, true);
    } else if (isValidMime) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de arquivo não permitido. Apenas arquivos .xls, .xlsx e .xlsm são aceitos. Recebido: ${ext || file.mimetype || 'desconhecido'}`));
    }
};

// Configuração do multer para planilhas
export const spreadsheetUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB (planilhas podem ser maiores que imagens)
    }
});
