"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legalDocumentController = void 0;
const zod_1 = require("zod");
const legalDocumentService_1 = require("../services/legalDocumentService");
const createDocumentSchema = zod_1.z.object({
    type: zod_1.z.enum(['TERMS', 'PRIVACY', 'CAMPAIGN_RULES']),
    content: zod_1.z.string().min(1),
    active: zod_1.z.boolean().optional()
});
const updateDocumentSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).optional(),
    active: zod_1.z.boolean().optional()
});
const acceptDocumentSchema = zod_1.z.object({
    legal_document_id: zod_1.z.number().int().positive()
});
exports.legalDocumentController = {
    // ============================================
    // ADMIN ENDPOINTS
    // ============================================
    async create(req, res) {
        try {
            const data = createDocumentSchema.parse(req.body);
            const documentId = await legalDocumentService_1.legalDocumentService.create(data);
            res.status(201).json({ success: true, id: documentId });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async findAll(req, res) {
        try {
            const documents = await legalDocumentService_1.legalDocumentService.findAll();
            res.json(documents);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async findByType(req, res) {
        try {
            const { type } = req.params;
            if (!['TERMS', 'PRIVACY', 'CAMPAIGN_RULES'].includes(type)) {
                return res.status(400).json({ message: 'Invalid document type' });
            }
            const documents = await legalDocumentService_1.legalDocumentService.findByType(type);
            res.json(documents);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async findById(req, res) {
        try {
            const { id } = req.params;
            const document = await legalDocumentService_1.legalDocumentService.findById(Number(id));
            if (!document) {
                return res.status(404).json({ message: 'Document not found' });
            }
            res.json(document);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = updateDocumentSchema.parse(req.body);
            await legalDocumentService_1.legalDocumentService.update(Number(id), data);
            res.json({ success: true });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async activate(req, res) {
        try {
            const { id } = req.params;
            await legalDocumentService_1.legalDocumentService.activate(Number(id));
            res.json({ success: true });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    // ============================================
    // PUBLIC/AGENCY ENDPOINTS
    // ============================================
    async getActiveDocuments(req, res) {
        try {
            const documents = await legalDocumentService_1.legalDocumentService.findActiveDocuments();
            res.json(documents);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getActiveByType(req, res) {
        try {
            const { type } = req.params;
            if (!['TERMS', 'PRIVACY', 'CAMPAIGN_RULES'].includes(type)) {
                return res.status(400).json({ message: 'Invalid document type' });
            }
            const document = await legalDocumentService_1.legalDocumentService.findActiveByType(type);
            if (!document) {
                return res.status(404).json({ message: 'No active document found for this type' });
            }
            res.json(document);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async acceptDocument(req, res) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const data = acceptDocumentSchema.parse(req.body);
            const ipAddress = req.ip || req.headers['x-forwarded-for'] || undefined;
            const userAgent = req.headers['user-agent'] || undefined;
            await legalDocumentService_1.legalDocumentService.createAcceptance({
                agency_id: req.agency.id,
                legal_document_id: data.legal_document_id,
                ip_address: ipAddress,
                user_agent: userAgent
            });
            res.json({ success: true });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.issues });
            }
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getPendingDocuments(req, res) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const pending = await legalDocumentService_1.legalDocumentService.getPendingDocumentsForAgency(req.agency.id);
            res.json(pending);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getAcceptedDocuments(req, res) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const accepted = await legalDocumentService_1.legalDocumentService.getAcceptedDocumentsForAgency(req.agency.id);
            res.json(accepted);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
