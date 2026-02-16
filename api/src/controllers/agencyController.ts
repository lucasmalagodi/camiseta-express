import { Request, Response } from 'express';
import { z } from 'zod';
import { agencyService } from '../services/agencyService';
import { addressService } from '../services/addressService';
import { query } from '../config/db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { deviceVerificationService } from '../services/deviceVerificationService';
import { emailService } from '../services/emailService';
import { legalDocumentService } from '../services/legalDocumentService';

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
    address: addressSchema,
    acceptedLegalDocuments: z.array(z.number().int().positive()).optional()
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
            
            // Verificar se agência já existe (buscar normalizado)
            const normalizedCnpj = data.cnpj.replace(/[^\d]/g, '');
            const existingResults = await query(
                `SELECT id FROM agencies 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
                [normalizedCnpj]
            ) as any[];
            
            if (Array.isArray(existingResults) && existingResults.length > 0) {
                return res.status(409).json({ 
                    eligible: false,
                    alreadyExists: true,
                    message: 'Agency already exists'
                });
            }
            
            const eligible = await agencyService.validateCnpjEligibility(data.cnpj);
            
            if (!eligible) {
                return res.status(404).json({ 
                    eligible: false,
                    alreadyExists: false
                });
            }

            // Buscar nome da agência mais comum
            const agencyName = await agencyService.getAgencyNameByCnpj(data.cnpj);

            res.json({ 
                eligible: true,
                alreadyExists: false,
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
                if (error.message.includes('must be accepted')) {
                    return res.status(400).json({ message: error.message });
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

            // Verificar documentos legais pendentes
            const pendingDocuments = await legalDocumentService.getPendingDocumentsForAgency(agency.id);
            if (pendingDocuments.length > 0) {
                // Retornar documentos pendentes para que o frontend possa exibir
                return res.status(403).json({ 
                    message: 'Você precisa aceitar os novos termos e políticas para continuar',
                    pendingDocuments: pendingDocuments.map(doc => ({
                        id: doc.id,
                        type: doc.type,
                        version: doc.version
                    })),
                    requiresAcceptance: true
                });
            }

            // Verificar dispositivo confiável
            const deviceToken = (req as any).cookies?.device_token;
            const ipAddress = req.ip || (req.socket.remoteAddress) || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
            const userAgent = req.get('user-agent') || 'unknown';

            const isTrusted = await deviceVerificationService.isDeviceTrusted(
                agency.id,
                deviceToken,
                ipAddress,
                userAgent
            );

            // Se dispositivo não é confiável, requer verificação por código
            if (!isTrusted) {
                console.log('Device not trusted, requiring verification code for agency:', agency.id);

                // Gerar código de verificação
                const verificationCode = await deviceVerificationService.createVerificationCode(
                    agency.id,
                    ipAddress,
                    userAgent
                );

                // Enviar código por email
                try {
                    await emailService.sendDeviceVerificationCode(
                        agency.email,
                        agency.name,
                        verificationCode
                    );
                } catch (emailError) {
                    console.error('Error sending verification code email:', emailError);
                    return res.status(500).json({ 
                        message: 'Erro ao enviar código de verificação. Tente novamente mais tarde.' 
                    });
                }

                return res.status(200).json({
                    requires2FA: true,
                    message: 'Código de verificação enviado por email'
                });
            }

            // Dispositivo confiável - fazer login normalmente
            console.log('Device trusted, proceeding with login for agency:', agency.id);

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
    },

    async verifyCode(req: Request, res: Response) {
        try {
            const { email, code } = z.object({
                email: z.string().email(),
                code: z.string().length(6, 'Código deve ter 6 dígitos')
            }).parse(req.body);

            // Normalizar email
            const normalizedEmail = email.trim().toLowerCase();

            // Buscar agência por email
            const agency = await agencyService.findByEmail(normalizedEmail);

            if (!agency) {
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }

            // Verificar se agência está ativa
            if (!agency.active) {
                return res.status(403).json({ message: 'Agência inativa' });
            }

            // Obter IP e user agent
            const ipAddress = req.ip || (req.socket.remoteAddress) || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
            const userAgent = req.get('user-agent') || 'unknown';

            // Verificar código
            const verificationResult = await deviceVerificationService.verifyCode(
                agency.id,
                code,
                ipAddress
            );

            if (!verificationResult.valid) {
                // Incrementar tentativas se código incorreto
                const newAttempts = await deviceVerificationService.incrementCodeAttempts(
                    agency.id,
                    ipAddress
                );

                const attemptsRemaining = Math.max(0, 5 - newAttempts);

                return res.status(401).json({ 
                    message: 'Código inválido ou expirado',
                    attemptsRemaining: attemptsRemaining
                });
            }

            // Código válido - gerar device token e registrar como confiável
            const deviceToken = deviceVerificationService.generateDeviceToken();
            
            await deviceVerificationService.trustDevice(
                agency.id,
                deviceToken,
                ipAddress,
                userAgent
            );

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

            // Configurar cookie HttpOnly, Secure, SameSite=Strict
            const isProduction = process.env.NODE_ENV === 'production';
            res.cookie('device_token', deviceToken, {
                httpOnly: true,
                secure: isProduction, // Apenas HTTPS em produção
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias em milissegundos
            });

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
            console.error('Erro na verificação de código:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    },

    async getMe(req: Request, res: Response) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const agency = await agencyService.findById(req.agency.id);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            const address = await addressService.findByAgencyId(req.agency.id);
            const balance = await agencyService.getBalance(req.agency.id);

            res.json({
                ...agency,
                balance,
                address
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async updateMe(req: Request, res: Response) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const data = z.object({
                name: z.string().min(1).optional(),
                phone: z.string().optional(),
                address: addressSchema.optional()
            }).parse(req.body);

            // Atualizar dados básicos
            if (data.name || data.phone) {
                await agencyService.update(req.agency.id, {
                    name: data.name,
                    phone: data.phone
                });
            }

            // Atualizar endereço se fornecido
            if (data.address) {
                const existingAddress = await addressService.findByAgencyId(req.agency.id);
                if (existingAddress) {
                    await addressService.update(req.agency.id, data.address);
                } else {
                    await addressService.create(req.agency.id, data.address);
                }
            }

            res.json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async changePassword(req: Request, res: Response) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { currentPassword, newPassword } = z.object({
                currentPassword: z.string().min(1),
                newPassword: z.string().min(6)
            }).parse(req.body);

            // Buscar agência
            const agency = await agencyService.findById(req.agency.id);
            if (!agency || !agency.password) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            // Verificar senha atual
            const currentHash = crypto.createHash('md5').update(currentPassword).digest('hex');
            const storedPassword = (agency.password || '').trim().toLowerCase();
            const inputHash = currentHash.toLowerCase();

            if (inputHash !== storedPassword) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            // Atualizar senha
            const newHash = crypto.createHash('md5').update(newPassword).digest('hex');
            await query(
                'UPDATE agencies SET password = ?, updated_at = NOW() WHERE id = ?',
                [newHash, req.agency.id]
            );

            res.json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
