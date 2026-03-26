import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface UserPayload {
    id: number;
    role: string;
    email?: string;
}

// Estendendo a interface Request para incluir o usuário
declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

/** Retorna JWT_SECRET; em produção exige que esteja definido (nunca usar fallback). */
export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && !secret) {
        throw new Error('JWT_SECRET deve estar definido em produção');
    }
    return secret || 'secret';
};

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret()) as UserPayload;

            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            };

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Não autorizado, token inválido' });
        }
    } else {
        res.status(401).json({ message: 'Não autorizado, sem token' });
    }
};

export const protectAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret()) as UserPayload;

            if (decoded.role !== 'admin') {
                return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
            }

            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            };

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Não autorizado, token inválido' });
        }
    } else {
        res.status(401).json({ message: 'Não autorizado, sem token' });
    }
};
