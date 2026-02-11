"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agencyController = void 0;
const zod_1 = require("zod");
const agencyService_1 = require("../services/agencyService");
const addressService_1 = require("../services/addressService");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const addressSchema = zod_1.z.object({
    cep: zod_1.z.string().min(1),
    street: zod_1.z.string().min(1),
    number: zod_1.z.string().min(1),
    complement: zod_1.z.string().optional(),
    neighborhood: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().length(2, "State must be 2 characters (UF)")
});
const createAgencySchema = zod_1.z.object({
    cnpj: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional(),
    address: addressSchema
});
const updateAgencySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    active: zod_1.z.boolean().optional()
});
const validateCnpjSchema = zod_1.z.object({
    cnpj: zod_1.z.string().min(1)
});
const registerAgencySchema = zod_1.z.object({
    cnpj: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string().min(6),
    address: addressSchema
});
exports.agencyController = {
    async create(req, res) {
        try {
            const data = createAgencySchema.parse(req.body);
            const id = await agencyService_1.agencyService.create(data);
            res.status(201).json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message.includes('already exists') || error.message.includes('No points import')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const data = updateAgencySchema.parse(req.body);
            const agency = await agencyService_1.agencyService.findById(id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }
            await agencyService_1.agencyService.update(id, data);
            res.json({ success: true, id });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message.includes('Cannot activate')) {
                    return res.status(400).json({ message: error.message });
                }
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const agency = await agencyService_1.agencyService.findById(id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }
            await agencyService_1.agencyService.softDelete(id);
            res.json({ success: true, id });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const agency = await agencyService_1.agencyService.findById(id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }
            // Incluir balance calculado do ledger
            const balance = await agencyService_1.agencyService.getBalance(id);
            // Buscar endereço da agência
            const address = await addressService_1.addressService.findByAgencyId(id);
            // Buscar dados do executivo se executive_name estiver preenchido
            let executive = null;
            if (agency.executive_name) {
                try {
                    const { executiveService } = await Promise.resolve().then(() => __importStar(require('../services/executiveService')));
                    const executiveData = await executiveService.findByExecutiveName(agency.executive_name);
                    if (executiveData) {
                        executive = {
                            code: executiveData.code,
                            name: executiveData.name || undefined,
                            email: executiveData.email
                        };
                    }
                }
                catch (error) {
                    console.error('Error fetching executive:', error);
                }
            }
            res.json({
                ...agency,
                balance,
                address: address || null,
                executive: executive || null
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getAll(req, res) {
        try {
            const active = req.query.active !== undefined ? req.query.active === 'true' : undefined;
            const agencies = await agencyService_1.agencyService.findAll(active);
            // Incluir balance para cada agência (branch e executive_name já vêm da tabela)
            const agenciesWithBalance = await Promise.all(agencies.map(async (agency) => {
                const balance = await agencyService_1.agencyService.getBalance(agency.id);
                return { ...agency, balance };
            }));
            res.json({ data: agenciesWithBalance, total: agenciesWithBalance.length });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getBalance(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const agency = await agencyService_1.agencyService.findById(id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }
            const balance = await agencyService_1.agencyService.getBalance(id);
            res.json({ agencyId: id, balance });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async validateCnpj(req, res) {
        try {
            const data = validateCnpjSchema.parse(req.body);
            const eligible = await agencyService_1.agencyService.validateCnpjEligibility(data.cnpj);
            if (!eligible) {
                return res.status(404).json({ eligible: false });
            }
            // Buscar nome da agência mais comum
            const agencyName = await agencyService_1.agencyService.getAgencyNameByCnpj(data.cnpj);
            res.json({
                eligible: true,
                agencyName: agencyName || null
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async register(req, res) {
        try {
            const data = registerAgencySchema.parse(req.body);
            const agencyId = await agencyService_1.agencyService.register(data);
            res.status(201).json({ success: true, agencyId });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message === 'Invalid CPF/CNPJ format' || error.message === 'Invalid CNPJ format') {
                    return res.status(400).json({ message: error.message });
                }
                if (error.message === 'CNPJ has no imported points') {
                    return res.status(403).json({ message: error.message });
                }
                if (error.message === 'Agency already exists') {
                    return res.status(409).json({ message: error.message });
                }
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async login(req, res) {
        try {
            const { email, password } = zod_1.z.object({
                email: zod_1.z.string().email(),
                password: zod_1.z.string().min(1)
            }).parse(req.body);
            // Normalizar email (trim e lowercase)
            const normalizedEmail = email.trim().toLowerCase();
            console.log('Login attempt for agency email:', normalizedEmail);
            // Buscar agência por email
            const agency = await agencyService_1.agencyService.findByEmail(normalizedEmail);
            if (!agency) {
                console.log('Agency not found for email:', email);
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }
            console.log('Agency found:', { id: agency.id, email: agency.email, active: agency.active, passwordLength: agency.password?.length });
            // Verificar se agência está ativa
            if (!agency.active) {
                console.log('Agency is inactive');
                return res.status(403).json({ message: 'Agência inativa' });
            }
            // Verificar senha
            if (!agency.password) {
                console.log('Agency has no password set');
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }
            // Verificar senha (MD5)
            const passwordHash = crypto_1.default.createHash('md5').update(password).digest('hex');
            // Remover espaços em branco e comparar
            const storedPassword = (agency.password || '').trim().toLowerCase();
            const inputHash = passwordHash.toLowerCase();
            const isPasswordValid = inputHash === storedPassword;
            console.log('Password check (MD5):', {
                inputPassword: password,
                inputHash: inputHash,
                storedHash: storedPassword,
                storedHashLength: storedPassword.length,
                inputHashLength: inputHash.length,
                isValid: isPasswordValid,
                exactMatch: inputHash === storedPassword
            });
            if (!isPasswordValid) {
                console.log('Invalid password for email:', email);
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }
            // Buscar dados completos da agência
            const fullAgency = await agencyService_1.agencyService.findById(agency.id);
            const balance = await agencyService_1.agencyService.getBalance(agency.id);
            if (!fullAgency) {
                return res.status(404).json({ message: 'Agência não encontrada' });
            }
            // Gerar token JWT
            const jwtSecret = process.env.JWT_SECRET || 'secret';
            const jwtExpire = process.env.JWT_EXPIRE || '30d';
            // @ts-ignore - expiresIn aceita string mas o tipo está muito restritivo
            const signOptions = { expiresIn: jwtExpire };
            const token = jsonwebtoken_1.default.sign({
                id: fullAgency.id,
                email: fullAgency.email,
                role: 'agency',
                agencyId: fullAgency.id
            }, jwtSecret, signOptions);
            res.status(200).json({
                id: fullAgency.id,
                name: fullAgency.name,
                email: fullAgency.email,
                balance: balance,
                active: fullAgency.active,
                token
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error('Erro no login de agência:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    }
};
