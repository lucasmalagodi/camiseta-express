"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rateLimitMiddleware_1 = require("./middlewares/rateLimitMiddleware");
const app = (0, express_1.default)();
// Trust proxy - necessário quando há proxy reverso (nginx, load balancer, etc.)
// Permite que o Express confie nos headers X-Forwarded-For para identificar IPs corretamente
// Configurar para confiar apenas no primeiro proxy (nginx) para segurança
app.set('trust proxy', 1);
// Security Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Permitir requisições sem origin (mobile apps, Postman, requisições do mesmo domínio via proxy reverso)
        if (!origin)
            return callback(null, true);
        // Lista de origens permitidas
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
            process.env.FRONTEND_URL,
            // Domínios de produção
            'https://onxp.com.br',
            'https://www.onxp.com.br',
            'https://ftravelseries.com.br',
            'https://www.ftravelseries.com.br'
        ].filter(Boolean);
        // Em desenvolvimento, permitir qualquer localhost
        if (process.env.NODE_ENV !== 'production') {
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return callback(null, true);
            }
        }
        // Verificar se a origem está na lista permitida
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            // Em produção, rejeitar origens não permitidas
            if (process.env.NODE_ENV === 'production') {
                console.warn(`[CORS] Origin não permitida: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
            else {
                // Em desenvolvimento, permitir qualquer origem
                callback(null, true);
            }
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use((0, hpp_1.default)());
// Rate Limiting adaptativo - admins têm limites muito mais altos
// Aplicar rate limiting adaptativo para todas as rotas da API
app.use('/api', rateLimitMiddleware_1.adaptiveRateLimit);
// Cookie Parser - necessário para ler cookies HttpOnly
app.use((0, cookie_parser_1.default)());
// Body Parser
// IMPORTANTE: Limite maior para uploads de arquivos (planilhas podem ser maiores)
// O multer gerencia o tamanho do arquivo, então o body parser só precisa lidar com outros campos
app.use(express_1.default.json({ limit: '10mb' })); // Aumentado para suportar outros campos grandes
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Servir arquivos estáticos (imagens) - OPCIONAL
// Em produção, os assets são servidos pelo frontend/nginx, não pela API
// Apenas servir se o diretório existir (desenvolvimento local)
const possibleAssetsPaths = [
    '/src/assets', // Volume do Docker (desenvolvimento)
    path_1.default.resolve(__dirname, '../../../src/assets'), // Do dist até src/assets
    path_1.default.resolve(__dirname, '../../../../fts/src/assets'), // Do dist até raiz do projeto
    '/var/www/ancdcampanha/fts/src/assets', // Caminho absoluto no servidor
];
const assetsPath = possibleAssetsPaths.find(p => fs_1.default.existsSync(p));
if (assetsPath) {
    console.log('✅ Serving static files from:', assetsPath);
    app.use('/assets', express_1.default.static(assetsPath, {
        maxAge: '1y', // Cache por 1 ano
        etag: true,
        lastModified: true
    }));
}
else {
    // Em produção sem volume, os assets são servidos pelo frontend
    // Não precisa avisar, é o comportamento esperado
    console.log('ℹ️  Assets directory not found - assets will be served by frontend/nginx');
}
// Routes Import
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const agencyRoutes_1 = __importDefault(require("./routes/agencyRoutes"));
const agencyPointsImportRoutes_1 = __importDefault(require("./routes/agencyPointsImportRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const utilsRoutes_1 = __importDefault(require("./routes/utilsRoutes"));
const smtpConfigRoutes_1 = __importDefault(require("./routes/smtpConfigRoutes"));
const orderNotificationEmailRoutes_1 = __importDefault(require("./routes/orderNotificationEmailRoutes"));
const executiveRoutes_1 = __importDefault(require("./routes/executiveRoutes"));
const heroProductRoutes_1 = __importDefault(require("./routes/heroProductRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const ticketRoutes_1 = __importDefault(require("./routes/ticketRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const branchRoutes_1 = __importDefault(require("./routes/branchRoutes"));
const executiveNotificationEmailRoutes_1 = __importDefault(require("./routes/executiveNotificationEmailRoutes"));
const legalDocumentRoutes_1 = __importDefault(require("./routes/legalDocumentRoutes"));
const sizeChartRoutes_1 = __importDefault(require("./routes/sizeChartRoutes"));
const backupRoutes_1 = __importDefault(require("./routes/backupRoutes"));
// Routes
// IMPORTANTE: Rotas mais específicas devem vir ANTES das rotas mais genéricas
// Isso evita que rotas genéricas capturem requisições destinadas a rotas específicas
// Rotas com prefixo /api (mantidas para compatibilidade)
app.use('/api/auth', authRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/agencies', agencyRoutes_1.default);
app.use('/api/agency-points-imports', agencyPointsImportRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/utils', utilsRoutes_1.default);
app.use('/api/hero-products', heroProductRoutes_1.default);
app.use('/api/tickets', ticketRoutes_1.default);
app.use('/api/legal-documents', legalDocumentRoutes_1.default);
app.use('/api/size-charts', sizeChartRoutes_1.default);
// Rotas admin com prefixo /api - específicas primeiro, depois genéricas
app.use('/api/admin/order-notification-emails', orderNotificationEmailRoutes_1.default);
app.use('/api/admin/executives', executiveRoutes_1.default);
app.use('/api/admin/executive-notification-emails', executiveNotificationEmailRoutes_1.default);
app.use('/api/admin/branches', branchRoutes_1.default);
app.use('/api/admin/users', userRoutes_1.default);
app.use('/api/admin/dashboard', dashboardRoutes_1.default);
app.use('/api/admin/reports', reportRoutes_1.default);
app.use('/api/admin/backups', backupRoutes_1.default);
app.use('/api/admin', smtpConfigRoutes_1.default); // Rota genérica por último
// Rotas sem prefixo /api (para produção com Nginx fazendo proxy direto)
app.use('/auth', authRoutes_1.default);
app.use('/categories', categoryRoutes_1.default);
app.use('/products', productRoutes_1.default);
app.use('/agencies', agencyRoutes_1.default);
app.use('/agency-points-imports', agencyPointsImportRoutes_1.default);
app.use('/orders', orderRoutes_1.default);
app.use('/utils', utilsRoutes_1.default);
app.use('/hero-products', heroProductRoutes_1.default);
app.use('/tickets', ticketRoutes_1.default);
app.use('/legal-documents', legalDocumentRoutes_1.default);
app.use('/size-charts', sizeChartRoutes_1.default);
// Rotas admin sem prefixo /api - específicas primeiro, depois genéricas
app.use('/admin/order-notification-emails', orderNotificationEmailRoutes_1.default);
app.use('/admin/executives', executiveRoutes_1.default);
app.use('/admin/executive-notification-emails', executiveNotificationEmailRoutes_1.default);
app.use('/admin/branches', branchRoutes_1.default);
app.use('/admin/users', userRoutes_1.default);
app.use('/admin/dashboard', dashboardRoutes_1.default);
app.use('/admin/reports', reportRoutes_1.default);
app.use('/admin/backups', backupRoutes_1.default);
app.use('/admin', smtpConfigRoutes_1.default); // Rota genérica por último
// Health check - disponível em /health e /api/health
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running' });
});
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running' });
});
// Middleware de debug para verificar rotas registradas (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    app.use('/api', (req, res, next) => {
        console.log(`[DEBUG] Route called: ${req.method} ${req.path}`);
        next();
    });
}
// Handler 404 - deve vir por último, depois de todas as rotas
app.use((req, res, next) => {
    console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
        path: req.path,
        originalUrl: req.originalUrl
    });
});
exports.default = app;
