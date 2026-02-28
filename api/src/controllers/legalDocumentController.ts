import { Request, Response } from 'express';
import { z } from 'zod';
import { legalDocumentService, LegalDocumentType } from '../services/legalDocumentService';
import { agencyService } from '../services/agencyService';
import crypto from 'crypto';

const createDocumentSchema = z.object({
    type: z.enum(['TERMS', 'PRIVACY', 'CAMPAIGN_RULES']),
    content: z.string().min(1),
    active: z.boolean().optional()
});

const updateDocumentSchema = z.object({
    content: z.string().min(1).optional(),
    active: z.boolean().optional()
});

const acceptDocumentSchema = z.object({
    legal_document_id: z.number().int().positive()
});

export const legalDocumentController = {
    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    async create(req: Request, res: Response) {
        try {
            const data = createDocumentSchema.parse(req.body);
            const documentId = await legalDocumentService.create(data);
            res.status(201).json({ success: true, id: documentId });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async findAll(req: Request, res: Response) {
        try {
            const documents = await legalDocumentService.findAll();
            res.json(documents);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async findByType(req: Request, res: Response) {
        try {
            const type = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
            if (!type || !['TERMS', 'PRIVACY', 'CAMPAIGN_RULES'].includes(type)) {
                return res.status(400).json({ message: 'Invalid document type' });
            }
            const documents = await legalDocumentService.findByType(type as LegalDocumentType);
            res.json(documents);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async findById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const document = await legalDocumentService.findById(Number(id));
            if (!document) {
                return res.status(404).json({ message: 'Document not found' });
            }
            res.json(document);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data = updateDocumentSchema.parse(req.body);
            await legalDocumentService.update(Number(id), data);
            res.json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async activate(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await legalDocumentService.activate(Number(id));
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // ============================================
    // PUBLIC/AGENCY ENDPOINTS
    // ============================================

    async getActiveDocuments(req: Request, res: Response) {
        try {
            const documents = await legalDocumentService.findActiveDocuments();
            res.json(documents);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getActiveByType(req: Request, res: Response) {
        try {
            const type = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
            if (!type || !['TERMS', 'PRIVACY', 'CAMPAIGN_RULES'].includes(type)) {
                return res.status(400).json({ message: 'Invalid document type' });
            }
            const document = await legalDocumentService.findActiveByType(type as LegalDocumentType);
            if (!document) {
                return res.status(404).json({ message: 'No active document found for this type' });
            }
            res.json(document);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async acceptDocument(req: Request, res: Response) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const data = acceptDocumentSchema.parse(req.body);
            const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || undefined;
            const userAgent = req.headers['user-agent'] || undefined;

            await legalDocumentService.createAcceptance({
                agency_id: req.agency.id,
                legal_document_id: data.legal_document_id,
                ip_address: ipAddress,
                user_agent: userAgent
            });

            res.json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getPendingDocuments(req: Request, res: Response) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const pending = await legalDocumentService.getPendingDocumentsForAgency(req.agency.id);
            res.json(pending);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAcceptedDocuments(req: Request, res: Response) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const accepted = await legalDocumentService.getAcceptedDocumentsForAgency(req.agency.id);
            res.json(accepted);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async acceptDocumentDuringLogin(req: Request, res: Response) {
        try {
            const { email, password, legal_document_ids } = z.object({
                email: z.string().email(),
                password: z.string().min(1),
                legal_document_ids: z.array(z.number().int().positive())
            }).parse(req.body);

            // Validar credenciais primeiro
            const normalizedEmail = email.trim().toLowerCase();
            const agency = await agencyService.findByEmail(normalizedEmail);

            if (!agency || !agency.active) {
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }

            // Verificar senha
            const passwordHash = crypto.createHash('md5').update(password).digest('hex');
            const storedPassword = (agency.password || '').trim().toLowerCase();
            const inputHash = passwordHash.toLowerCase();

            if (inputHash !== storedPassword) {
                return res.status(401).json({ message: 'Credenciais inválidas' });
            }

            // Aceitar documentos
            const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || undefined;
            const userAgent = req.headers['user-agent'] || undefined;

            for (const docId of legal_document_ids) {
                await legalDocumentService.createAcceptance({
                    agency_id: agency.id,
                    legal_document_id: docId,
                    ip_address: ipAddress,
                    user_agent: userAgent
                });
            }

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
