"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectAgency = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const protectAgency = async (req, res, next) => {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            // Verify token using JWT
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            // Verificar se é uma agência
            if (decoded.role !== 'agency') {
                return res.status(403).json({ message: 'Acesso negado. Token de agência requerido.' });
            }
            // Add agency to request
            req.agency = {
                id: decoded.agencyId || decoded.id,
                email: decoded.email
            };
            next();
        }
        catch (error) {
            console.error('Agency auth error:', error);
            res.status(401).json({ message: 'Não autorizado, token inválido' });
        }
    }
    else {
        res.status(401).json({ message: 'Não autorizado, sem token' });
    }
};
exports.protectAgency = protectAgency;
