"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.adaptiveRateLimit = exports.strictLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Função para verificar se o usuário é admin (sem bloquear se não for)
const isAdmin = (req) => {
    // Se já tiver o user no request (após autenticação), usar diretamente
    if (req.user && req.user.role === 'admin') {
        return true;
    }
    // Tentar verificar o token diretamente do header (para rate limiting antes da autenticação)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            const token = authHeader.split(' ')[1];
            // Decodificar sem validar expiração (para rate limiting)
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.role === 'admin') {
                // Tentar verificar se o token é válido (mas não bloquear por expiração)
                try {
                    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
                    return true;
                }
                catch (verifyError) {
                    // Mesmo que o token esteja expirado, se o role for admin, consideramos admin
                    // A autenticação real vai bloquear depois se necessário
                    return decoded.role === 'admin';
                }
            }
        }
        catch (error) {
            // Se houver erro ao decodificar, não é admin
            return false;
        }
    }
    return false;
};
exports.isAdmin = isAdmin;
// Rate limiter para usuários normais (GET requests)
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs para GET
    message: 'Muitas requisições criadas a partir deste IP, por favor tente novamente após alguns minutos',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isAdmin(req), // Pular rate limit se for admin
});
// Rate limiter restritivo para operações de escrita
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs para operações de escrita
    message: 'Muitas requisições criadas a partir deste IP, por favor tente novamente após alguns minutos',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isAdmin(req), // Pular rate limit se for admin
});
// Middleware customizado que aplica rate limiting baseado no tipo de usuário
const adaptiveRateLimit = (req, res, next) => {
    // Se for admin, pular completamente o rate limiting
    if (isAdmin(req)) {
        return next();
    }
    // Usuário normal: aplicar rate limiting baseado no método HTTP
    if (req.method === 'GET') {
        return (0, exports.generalLimiter)(req, res, next);
    }
    else {
        return (0, exports.strictLimiter)(req, res, next);
    }
};
exports.adaptiveRateLimit = adaptiveRateLimit;
