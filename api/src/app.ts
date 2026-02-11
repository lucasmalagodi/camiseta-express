import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import path from 'path';
import fs from 'fs';
import { adaptiveRateLimit } from './middlewares/rateLimitMiddleware';

const app = express();

// Trust proxy - necessário quando há proxy reverso (nginx, load balancer, etc.)
// Permite que o Express confie nos headers X-Forwarded-For para identificar IPs corretamente
// Configurar para confiar apenas no primeiro proxy (nginx) para segurança
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: '*', // TODO: Restringir para o domínio do frontend em produção
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(hpp());

// Rate Limiting adaptativo - admins têm limites muito mais altos
// Aplicar rate limiting adaptativo para todas as rotas da API
app.use('/api', adaptiveRateLimit);

// Body Parser
// IMPORTANTE: Limite maior para uploads de arquivos (planilhas podem ser maiores)
// O multer gerencia o tamanho do arquivo, então o body parser só precisa lidar com outros campos
app.use(express.json({ limit: '10mb' })); // Aumentado para suportar outros campos grandes
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos (imagens) - OPCIONAL
// Em produção, os assets são servidos pelo frontend/nginx, não pela API
// Apenas servir se o diretório existir (desenvolvimento local)
const possibleAssetsPaths = [
    '/src/assets',                                    // Volume do Docker (desenvolvimento)
    path.resolve(__dirname, '../../../src/assets'),  // Do dist até src/assets
    path.resolve(__dirname, '../../../../fts/src/assets'), // Do dist até raiz do projeto
    '/var/www/ancdcampanha/fts/src/assets',           // Caminho absoluto no servidor
];

const assetsPath = possibleAssetsPaths.find(p => fs.existsSync(p));

if (assetsPath) {
    console.log('✅ Serving static files from:', assetsPath);
app.use('/assets', express.static(assetsPath, {
    maxAge: '1y', // Cache por 1 ano
    etag: true,
    lastModified: true
}));
} else {
    // Em produção sem volume, os assets são servidos pelo frontend
    // Não precisa avisar, é o comportamento esperado
    console.log('ℹ️  Assets directory not found - assets will be served by frontend/nginx');
}

// Routes Import
import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import agencyRoutes from './routes/agencyRoutes';
import agencyPointsImportRoutes from './routes/agencyPointsImportRoutes';
import orderRoutes from './routes/orderRoutes';
import utilsRoutes from './routes/utilsRoutes';
import smtpConfigRoutes from './routes/smtpConfigRoutes';
import orderNotificationEmailRoutes from './routes/orderNotificationEmailRoutes';
import executiveRoutes from './routes/executiveRoutes';
import heroProductRoutes from './routes/heroProductRoutes';
import userRoutes from './routes/userRoutes';
import ticketRoutes from './routes/ticketRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import reportRoutes from './routes/reportRoutes';

// Routes
// IMPORTANTE: Rotas mais específicas devem vir ANTES das rotas mais genéricas
// Isso evita que rotas genéricas capturem requisições destinadas a rotas específicas

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/agency-points-imports', agencyPointsImportRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/utils', utilsRoutes);
app.use('/api/hero-products', heroProductRoutes);
app.use('/api/tickets', ticketRoutes);

// Rotas admin - específicas primeiro, depois genéricas
app.use('/api/admin/order-notification-emails', orderNotificationEmailRoutes);
app.use('/api/admin/executives', executiveRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/admin', smtpConfigRoutes); // Rota genérica por último

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

export default app;
