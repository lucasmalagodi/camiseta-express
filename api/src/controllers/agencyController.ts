import { Request, Response } from 'express';
import { z } from 'zod';
import { agencyService } from '../services/agencyService';
import { addressService } from '../services/addressService';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const addressSchema = z.object({
    cep: z.string().min(1),
    street: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional(),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2, "State must be 2 characters (UF)")
});

const createAgencySchema = z.object({
    cnpj: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: addressSchema
});

const updateAgencySchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    active: z.boolean().optional()
});

const validateCnpjSchema = z.object({
    cnpj: z.string().min(1)
});

const registerAgencySchema = z.object({
    cnpj: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(6),
    address: addressSchema
});

export const agencyController = {
    async create(req: Request, res: Response) {
        try {
            const data = createAgencySchema.parse(req.body);
            const id = await agencyService.create(data);
            res.status(201).json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
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

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const data = updateAgencySchema.parse(req.body);
            const agency = await agencyService.findById(id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            await agencyService.update(id, data);
            res.json({ success: true, id });
        } catch (error) {
            if (error instanceof z.ZodError) {
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

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const agency = await agencyService.findById(id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            await agencyService.softDelete(id);
            res.json({ success: true, id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const agency = await agencyService.findById(id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            // Incluir balance calculado do ledger
            const balance = await agencyService.getBalance(id);
            
            // Buscar endereço da agência
            const address = await addressService.findByAgencyId(id);
            
            // Buscar dados do executivo se executive_name estiver preenchido
            let executive = null;
            if (agency.executive_name) {
                try {
                    const { executiveService } = await import('../services/executiveService');
                    const executiveData = await executiveService.findByExecutiveName(agency.executive_name);
                    if (executiveData) {
                        executive = {
                            code: executiveData.code,
                            name: executiveData.name || undefined,
                            email: executiveData.email
                        };
                    }
                } catch (error) {
                    console.error('Error fetching executive:', error);
                }
            }
            
            res.json({ 
                ...agency, 
                balance, 
                address: address || null,
                executive: executive || null
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAll(req: Request, res: Response) {
        try {
            const active = req.query.active !== undefined ? req.query.active === 'true' : undefined;
            const agencies = await agencyService.findAll(active);
            
            // Incluir balance para cada agência (branch e executive_name já vêm da tabela)
            const agenciesWithBalance = await Promise.all(
                agencies.map(async (agency) => {
                    const balance = await agencyService.getBalance(agency.id);
                    return { ...agency, balance };
                })
            );

            res.json({ data: agenciesWithBalance, total: agenciesWithBalance.length });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getBalance(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id as string);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }

            const agency = await agencyService.findById(id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            const balance = await agencyService.getBalance(id);
            res.json({ agencyId: id, balance });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async validateCnpj(req: Request, res: Response) {
        try {
            const data = validateCnpjSchema.parse(req.body);
            const eligible = await agencyService.validateCnpjEligibility(data.cnpj);
            
            if (!eligible) {
                return res.status(404).json({ eligible: false });
            }

            // Buscar nome da agência mais comum
            const agencyName = await agencyService.getAgencyNameByCnpj(data.cnpj);

            res.json({ 
                eligible: true,
                agencyName: agencyName || null
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async register(req: Request, res: Response) {
        try {
            const data = registerAgencySchema.parse(req.body);
            const agencyId = await agencyService.register(data);
            res.status(201).json({ success: true, agencyId });
        } catch (error) {
            if (error instanceof z.ZodError) {
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

    async login(req: Request, res: Response) {
        try {
            const { email, password } = z.object({
                email: z.string().email(),
                password: z.string().min(1)
            }).parse(req.body);

            // Normalizar email (trim e lowercase)
            const normalizedEmail = email.trim().toLowerCase();
            console.log('Login attempt for agency email:', normalizedEmail);

            // Buscar agência por email
            const agency = await agencyService.findByEmail(normalizedEmail);

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
            const passwordHash = crypto.createHash('md5').update(password).digest('hex');
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
            const fullAgency = await agencyService.findById(agency.id);
            const balance = await agencyService.getBalance(agency.id);

            if (!fullAgency) {
                return res.status(404).json({ message: 'Agência não encontrada' });
            }

            // Gerar token JWT
            const jwtSecret: string = process.env.JWT_SECRET || 'secret';
            const jwtExpire: string = process.env.JWT_EXPIRE || '30d';

            // @ts-ignore - expiresIn aceita string mas o tipo está muito restritivo
            const signOptions: jwt.SignOptions = { expiresIn: jwtExpire };
            const token = jwt.sign(
                { 
                    id: fullAgency.id, 
                    email: fullAgency.email, 
                    role: 'agency',
                    agencyId: fullAgency.id 
                },
                jwtSecret,
                signOptions
            );

            res.status(200).json({
                id: fullAgency.id,
                name: fullAgency.name,
                email: fullAgency.email,
                balance: balance,
                active: fullAgency.active,
                token
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error('Erro no login de agência:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    }
};
