import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { userService } from '../services/userService';

const createUserSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    role: z.enum(['admin', 'user', 'agency']).default('admin'),
});

const updateUserSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
    role: z.enum(['admin', 'user', 'agency']).optional(),
});

const updateStatusSchema = z.object({
    active: z.boolean(),
});

export const userController = {
    async getAll(req: Request, res: Response) {
        try {
            const filters: any = {};

            if (req.query.name) {
                filters.name = req.query.name as string;
            }

            if (req.query.email) {
                filters.email = req.query.email as string;
            }

            if (req.query.role) {
                filters.role = req.query.role as string;
            }

            if (req.query.active !== undefined) {
                filters.active = req.query.active === 'true';
            }

            const users = await userService.findAll(filters);
            res.json({ data: users, total: users.length });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Erro ao buscar usuários' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            const user = await userService.findById(id);
            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            res.json(user);
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ message: 'Erro ao buscar usuário' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createUserSchema.parse(req.body);

            // Hash da senha
            const hashedPassword = await bcrypt.hash(data.password, 10);

            const id = await userService.create({
                ...data,
                password: hashedPassword,
            });

            res.status(201).json({ 
                success: true, 
                id,
                message: 'Usuário criado com sucesso' 
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ 
                    message: 'Dados inválidos', 
                    errors: error.issues 
                });
            }
            if (error instanceof Error) {
                if (error.message.includes('já cadastrado')) {
                    return res.status(400).json({ message: error.message });
                }
                if (error.message.includes('inválido')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error('Error creating user:', error);
            res.status(500).json({ message: 'Erro ao criar usuário' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            // Verificar se usuário existe
            const existingUser = await userService.findById(id);
            if (!existingUser) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            const data = updateUserSchema.parse(req.body);
            await userService.update(id, data);

            res.json({ 
                success: true, 
                id,
                message: 'Usuário atualizado com sucesso' 
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ 
                    message: 'Dados inválidos', 
                    errors: error.issues 
                });
            }
            if (error instanceof Error) {
                if (error.message.includes('inválido')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error('Error updating user:', error);
            res.status(500).json({ message: 'Erro ao atualizar usuário' });
        }
    },

    async updateStatus(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }

            // Verificar se usuário existe
            const existingUser = await userService.findById(id);
            if (!existingUser) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            // Não permitir bloquear a si mesmo
            if (req.user && req.user.id === id) {
                return res.status(400).json({ 
                    message: 'Você não pode bloquear a si mesmo' 
                });
            }

            const data = updateStatusSchema.parse(req.body);
            await userService.updateStatus(id, data.active);

            res.json({ 
                success: true, 
                id,
                message: data.active ? 'Usuário desbloqueado com sucesso' : 'Usuário bloqueado com sucesso' 
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ 
                    message: 'Dados inválidos', 
                    errors: error.issues 
                });
            }
            console.error('Error updating user status:', error);
            res.status(500).json({ message: 'Erro ao atualizar status do usuário' });
        }
    },
};
