"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.loginLimiter = exports.adaptiveRateLimit = exports.strictLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware_1 = require("./authMiddleware");
// Função para verificar se o usuário é admin (sem bloquear se não for)
const isAdmin = (req) => {
    if (req.user && req.user.role === 'admin') {
        return true;
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.role === 'admin') {
                try {
                    jsonwebtoken_1.default.verify(token, (0, authMiddleware_1.getJwtSecret)());
                    return true;
                }
                catch {
                    return decoded.role === 'admin';
                }
            }
        }
        catch {
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
/** Rate limiter rigoroso para login (anti brute-force). 5 tentativas por 15 min por IP. */
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});
