import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/db';

// Schema de validação com Zod
const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['admin', 'agency', 'user']).optional().default('user')
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

// Interface para o usuário
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    role: string;
    active?: boolean;
}

export const register = async (req: Request, res: Response) => {
    try {
        // Validação
        const { name, email, password, role } = registerSchema.parse(req.body);

        // Verificar se o email já existe
        const existingUsers = await query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        ) as User[];

        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir usuário no banco
        const result = await query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        ) as any;

        const userId = result.insertId;

        // Gerar token JWT
        const jwtSecret: string = process.env.JWT_SECRET || 'secret';
        const jwtExpire: string = process.env.JWT_EXPIRE || '30d';
        // @ts-ignore - expiresIn aceita string mas o tipo está muito restritivo
        const signOptions: jwt.SignOptions = { expiresIn: jwtExpire };
        const token = jwt.sign(
            { id: userId, email, role },
            jwtSecret,
            signOptions
        );

        res.status(201).json({
            _id: userId,
            name,
            email,
            role,
            token,
            message: 'Usuário registrado com sucesso!'
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.issues });
        }
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        console.log('Login attempt for email:', email);

        // Buscar usuário no banco
        const users = await query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        ) as User[];

        if (!Array.isArray(users) || users.length === 0) {
            console.log('User not found for email:', email);
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const user = users[0];
        console.log('User found, role:', user.role);

        // Verificar se usuário está ativo (se o campo existir)
        // Se active for undefined, considerar como ativo (compatibilidade com registros antigos)
        if (user.active !== undefined && !user.active) {
            console.log('User is inactive for email:', email);
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Verificar senha (suporta MD5 e bcrypt)
        let isPasswordValid = false;
        
        // Verificar se é hash MD5 (32 caracteres hexadecimais)
        if (user.password.length === 32 && /^[a-f0-9]{32}$/i.test(user.password)) {
            // Comparar MD5
            const passwordHash = crypto.createHash('md5').update(password).digest('hex');
            isPasswordValid = passwordHash.toLowerCase() === user.password.toLowerCase();
            console.log('Password check (MD5):', isPasswordValid);
        } else {
            // Tentar bcrypt
            isPasswordValid = await bcrypt.compare(password, user.password);
            console.log('Password check (bcrypt):', isPasswordValid);
        }

        if (!isPasswordValid) {
            console.log('Invalid password for email:', email);
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Gerar token JWT
        const jwtSecret: string = process.env.JWT_SECRET || 'secret';
        const jwtExpire: string = process.env.JWT_EXPIRE || '30d';
        // @ts-ignore - expiresIn aceita string mas o tipo está muito restritivo
        const signOptions: jwt.SignOptions = { expiresIn: jwtExpire };
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            jwtSecret,
            signOptions
        );

        console.log('Login successful for user:', user.email, 'role:', user.role);
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error:', error.issues);
            return res.status(400).json({ message: error.issues });
        }
        console.error('Login error:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        // O user já foi anexado ao req pelo middleware
        if (!req.user) {
            return res.status(401).json({ message: 'Não autorizado' });
        }

        // Buscar dados atualizados do usuário
        const users = await query(
            'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
            [req.user.id]
        ) as User[];

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const user = users[0];

        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};
