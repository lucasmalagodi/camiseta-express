import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './authMiddleware';

interface UserPayload {
    id: number;
    role: string;
    email?: string;
}

// Função para verificar se o usuário é admin (sem bloquear se não for)
const isAdmin = (req: Request): boolean => {
    if (req.user && req.user.role === 'admin') {
        return true;
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.decode(token) as UserPayload;
            if (decoded && decoded.role === 'admin') {
                try {
                    jwt.verify(token, getJwtSecret());
                    return true;
                } catch {
                    return decoded.role === 'admin';
                }
            }
        } catch {
            return false;
        }
    }

    return false;
};

// Rate limiter para usuários normais (GET requests)
export const generalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs para GET
    message: 'Muitas requisições criadas a partir deste IP, por favor tente novamente após alguns minutos',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => isAdmin(req), // Pular rate limit se for admin
});

// Rate limiter restritivo para operações de escrita
export const strictLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs para operações de escrita
    message: 'Muitas requisições criadas a partir deste IP, por favor tente novamente após alguns minutos',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => isAdmin(req), // Pular rate limit se for admin
});

// Middleware customizado que aplica rate limiting baseado no tipo de usuário
export const adaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
    // Se for admin, pular completamente o rate limiting
    if (isAdmin(req)) {
        return next();
    }

    // Usuário normal: aplicar rate limiting baseado no método HTTP
    if (req.method === 'GET') {
        return generalLimiter(req, res, next);
    } else {
        return strictLimiter(req, res, next);
    }
};

/** Rate limiter rigoroso para login (anti brute-force). 5 tentativas por 15 min por IP. */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export { isAdmin };
