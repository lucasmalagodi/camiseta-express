"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rateLimitMiddleware_1 = require("./middlewares/rateLimitMiddleware");
const app = (0, express_1.default)();
// Security Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));
app.use((0, cors_1.default)({
    origin: '*', // TODO: Restringir para o domínio do frontend em produção
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use((0, hpp_1.default)());
// Rate Limiting adaptativo - admins têm limites muito mais altos
// Aplicar rate limiting adaptativo para todas as rotas da API
app.use('/api', rateLimitMiddleware_1.adaptiveRateLimit);
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
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/agencies', agencyRoutes_1.default);
app.use('/api/agency-points-imports', agencyPointsImportRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/utils', utilsRoutes_1.default);
app.use('/api/admin', smtpConfigRoutes_1.default);
app.use('/api/admin/order-notification-emails', orderNotificationEmailRoutes_1.default);
app.use('/api/admin/executives', executiveRoutes_1.default);
app.use('/api/admin/users', userRoutes_1.default);
app.use('/api/admin/dashboard', dashboardRoutes_1.default);
app.use('/api/admin/reports', reportRoutes_1.default);
app.use('/api/hero-products', heroProductRoutes_1.default);
app.use('/api/tickets', ticketRoutes_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running' });
});
exports.default = app;
