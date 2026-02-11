import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AgencyPayload {
    id: number;
    agencyId: number;
    email?: string;
    role: string;
}

// Estendendo a interface Request para incluir a agência
declare global {
    namespace Express {
        interface Request {
            agency?: {
                id: number;
                email?: string;
            };
        }
    }
}

export const protectAgency = async (req: Request, res: Response, next: NextFunction) => {
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
            ) as AgencyPayload;

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
        } catch (error) {
            console.error('Agency auth error:', error);
            res.status(401).json({ message: 'Não autorizado, token inválido' });
        }
    } else {
        res.status(401).json({ message: 'Não autorizado, sem token' });
    }
};
