"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
// Schema de validação com Zod
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['admin', 'agency', 'user']).optional().default('user')
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
const register = async (req, res) => {
    try {
        // Validação
        const { name, email, password, role } = registerSchema.parse(req.body);
        // Verificar se o email já existe
        const existingUsers = await (0, db_1.query)('SELECT id FROM users WHERE email = ?', [email]);
        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }
        // Hash da senha
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Inserir usuário no banco
        const result = await (0, db_1.query)('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role]);
        const userId = result.insertId;
        // Gerar token JWT
        const jwtSecret = process.env.JWT_SECRET || 'secret';
        const jwtExpire = process.env.JWT_EXPIRE || '30d';
        // @ts-ignore - expiresIn aceita string mas o tipo está muito restritivo
        const signOptions = { expiresIn: jwtExpire };
        const token = jsonwebtoken_1.default.sign({ id: userId, email, role }, jwtSecret, signOptions);
        res.status(201).json({
            _id: userId,
            name,
            email,
            role,
            token,
            message: 'Usuário registrado com sucesso!'
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: error.issues });
        }
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        console.log('Login attempt for email:', email);
        // Buscar usuário no banco
        const users = await (0, db_1.query)('SELECT * FROM users WHERE email = ?', [email]);
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
            const passwordHash = crypto_1.default.createHash('md5').update(password).digest('hex');
            isPasswordValid = passwordHash.toLowerCase() === user.password.toLowerCase();
            console.log('Password check (MD5):', isPasswordValid);
        }
        else {
            // Tentar bcrypt
            isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
            console.log('Password check (bcrypt):', isPasswordValid);
        }
        if (!isPasswordValid) {
            console.log('Invalid password for email:', email);
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }
        // Gerar token JWT
        const jwtSecret = process.env.JWT_SECRET || 'secret';
        const jwtExpire = process.env.JWT_EXPIRE || '30d';
        // @ts-ignore - expiresIn aceita string mas o tipo está muito restritivo
        const signOptions = { expiresIn: jwtExpire };
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, signOptions);
        console.log('Login successful for user:', user.email, 'role:', user.role);
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('Validation error:', error.issues);
            return res.status(400).json({ message: error.issues });
        }
        console.error('Login error:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        // O user já foi anexado ao req pelo middleware
        if (!req.user) {
            return res.status(401).json({ message: 'Não autorizado' });
        }
        // Buscar dados atualizados do usuário
        const users = await (0, db_1.query)('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?', [req.user.id]);
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};
exports.getMe = getMe;
