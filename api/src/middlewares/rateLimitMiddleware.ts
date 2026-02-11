import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

interface UserPayload {
    id: number;
    role: string;
    email?: string;
}

// Função para verificar se o usuário é admin (sem bloquear se não for)
const isAdmin = (req: Request): boolean => {
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
            const decoded = jwt.decode(token) as UserPayload;
            if (decoded && decoded.role === 'admin') {
                // Tentar verificar se o token é válido (mas não bloquear por expiração)
                try {
                    jwt.verify(token, process.env.JWT_SECRET || 'secret');
                    return true;
                } catch (verifyError) {
                    // Mesmo que o token esteja expirado, se o role for admin, consideramos admin
                    // A autenticação real vai bloquear depois se necessário
                    return decoded.role === 'admin';
                }
            }
        } catch (error) {
            // Se houver erro ao decodificar, não é admin
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

export { isAdmin };
