"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectAdmin = exports.protect = exports.getJwtSecret = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/** Retorna JWT_SECRET; em produção exige que esteja definido (nunca usar fallback). */
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && !secret) {
        throw new Error('JWT_SECRET deve estar definido em produção');
    }
    return secret || 'secret';
};
exports.getJwtSecret = getJwtSecret;
const protect = async (req, res, next) => {
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, (0, exports.getJwtSecret)());
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            };
            next();
        }
        catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Não autorizado, token inválido' });
        }
    }
    else {
        res.status(401).json({ message: 'Não autorizado, sem token' });
    }
};
exports.protect = protect;
const protectAdmin = async (req, res, next) => {
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, (0, exports.getJwtSecret)());
            if (decoded.role !== 'admin') {
                return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
            }
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            };
            next();
        }
        catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Não autorizado, token inválido' });
        }
    }
    else {
        res.status(401).json({ message: 'Não autorizado, sem token' });
    }
};
exports.protectAdmin = protectAdmin;
