import { Router } from 'express';
import { legalDocumentController } from '../controllers/legalDocumentController';
import { protectAdmin } from '../middlewares/authMiddleware';
import { protectAgency } from '../middlewares/agencyAuthMiddleware';

const router = Router();

// Admin routes (protected)
router.post('/', protectAdmin, legalDocumentController.create);
router.get('/', protectAdmin, legalDocumentController.findAll);
router.get('/type/:type', protectAdmin, legalDocumentController.findByType);
router.get('/:id', protectAdmin, legalDocumentController.findById);
router.put('/:id', protectAdmin, legalDocumentController.update);
router.post('/:id/activate', protectAdmin, legalDocumentController.activate);

// Public routes (for registration)
router.get('/public/active', legalDocumentController.getActiveDocuments);
router.get('/public/active/:type', legalDocumentController.getActiveByType);
router.post('/public/accept-during-login', legalDocumentController.acceptDocumentDuringLogin);

// Agency routes (protected)
router.get('/agency/pending', protectAgency, legalDocumentController.getPendingDocuments);
router.get('/agency/accepted', protectAgency, legalDocumentController.getAcceptedDocuments);
router.get('/agency/:id', protectAgency, legalDocumentController.findById);
router.post('/agency/accept', protectAgency, legalDocumentController.acceptDocument);

export default router;
