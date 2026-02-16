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

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token using JWT
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'secret'
            ) as UserPayload;

            // Add user to request
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
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token using JWT
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'secret'
            ) as UserPayload;

            // Verificar se é admin
            if (decoded.role !== 'admin') {
                return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
            }

            // Add user to request
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
