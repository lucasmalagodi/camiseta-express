"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadsheetUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Criar diretório de uploads de planilhas
const getBaseAssetsPath = () => {
    const dockerPath = '/src/assets';
    const devPath = path_1.default.resolve(__dirname, '../../src/assets');
    if (process.env.NODE_ENV === 'production' || fs_1.default.existsSync(dockerPath)) {
        try {
            if (!fs_1.default.existsSync(dockerPath)) {
                fs_1.default.mkdirSync(dockerPath, { recursive: true });
            }
            return dockerPath;
        }
        catch (error) {
            console.error('Error with Docker path, trying dev path:', error);
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
        try {
            fs_1.default.mkdirSync(dockerPath, { recursive: true });
            return dockerPath;
        }
        catch (dockerError) {
            throw new Error('Failed to create assets directory');
        }
    }
};
const baseAssetsPath = getBaseAssetsPath();
const spreadsheetsDir = path_1.default.join(baseAssetsPath, 'spreadsheets');
// Garantir que o diretório exista
if (!fs_1.default.existsSync(spreadsheetsDir)) {
    fs_1.default.mkdirSync(spreadsheetsDir, { recursive: true });
    console.log('✅ Created spreadsheets upload directory:', spreadsheetsDir);
}
// Configuração do storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs_1.default.existsSync(spreadsheetsDir)) {
                fs_1.default.mkdirSync(spreadsheetsDir, { recursive: true });
            }
            cb(null, spreadsheetsDir);
        }
        catch (error) {
            console.error('❌ Error creating spreadsheets directory:', error);
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
// Filtro de tipos de arquivo permitidos (planilhas)
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.xls', '.xlsx', '.xlsm'];
    const allowedMimes = [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
        'application/octet-stream' // Fallback para alguns navegadores com .xlsm
    ];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    const isValidMime = allowedMimes.includes(file.mimetype) || file.mimetype === '';
    // Aceitar se extensão for válida (prioridade) OU mimetype for válido
    // Alguns navegadores não enviam mimetype correto para .xlsm, então confiamos na extensão
    if (isValidExtension) {
        cb(null, true);
    }
    else if (isValidMime) {
        cb(null, true);
    }
    else {
        cb(new Error(`Tipo de arquivo não permitido. Apenas arquivos .xls, .xlsx e .xlsm são aceitos. Recebido: ${ext || file.mimetype || 'desconhecido'}`));
    }
};
// Configuração do multer para planilhas
exports.spreadsheetUpload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB (planilhas podem ser maiores que imagens)
    }
});
