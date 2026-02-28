"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userService_1 = require("../services/userService");
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    role: zod_1.z.enum(['admin', 'user', 'agency']).default('admin'),
});
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
    role: zod_1.z.enum(['admin', 'user', 'agency']).optional(),
    password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
});
const updateStatusSchema = zod_1.z.object({
    active: zod_1.z.boolean(),
});
exports.userController = {
    async getAll(req, res) {
        try {
            const filters = {};
            if (req.query.name) {
                filters.name = req.query.name;
            }
            if (req.query.email) {
                filters.email = req.query.email;
            }
            if (req.query.role) {
                filters.role = req.query.role;
            }
            if (req.query.active !== undefined) {
                filters.active = req.query.active === 'true';
            }
            const users = await userService_1.userService.findAll(filters);
            res.json({ data: users, total: users.length });
        }
        catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Erro ao buscar usuários' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const user = await userService_1.userService.findById(id);
            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }
            res.json(user);
        }
        catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ message: 'Erro ao buscar usuário' });
        }
    },
    async create(req, res) {
        try {
            const data = createUserSchema.parse(req.body);
            // Hash da senha
            const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
            const id = await userService_1.userService.create({
                ...data,
                password: hashedPassword,
            });
            res.status(201).json({
                success: true,
                id,
                message: 'Usuário criado com sucesso'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            // Verificar se usuário existe
            const existingUser = await userService_1.userService.findById(id);
            if (!existingUser) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }
            const data = updateUserSchema.parse(req.body);
            // Se senha foi fornecida, fazer hash antes de atualizar
            const updateData = { ...data };
            if (data.password) {
                updateData.password = await bcryptjs_1.default.hash(data.password, 10);
            }
            await userService_1.userService.update(id, updateData);
            res.json({
                success: true,
                id,
                message: 'Usuário atualizado com sucesso'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    async updateStatus(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            // Verificar se usuário existe
            const existingUser = await userService_1.userService.findById(id);
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
            await userService_1.userService.updateStatus(id, data.active);
            res.json({
                success: true,
                id,
                message: data.active ? 'Usuário desbloqueado com sucesso' : 'Usuário bloqueado com sucesso'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
