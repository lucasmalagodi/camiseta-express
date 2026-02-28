"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const legalDocumentController_1 = require("../controllers/legalDocumentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const agencyAuthMiddleware_1 = require("../middlewares/agencyAuthMiddleware");
const router = (0, express_1.Router)();
// Admin routes (protected)
router.post('/', authMiddleware_1.protectAdmin, legalDocumentController_1.legalDocumentController.create);
router.get('/', authMiddleware_1.protectAdmin, legalDocumentController_1.legalDocumentController.findAll);
router.get('/type/:type', authMiddleware_1.protectAdmin, legalDocumentController_1.legalDocumentController.findByType);
router.get('/:id', authMiddleware_1.protectAdmin, legalDocumentController_1.legalDocumentController.findById);
router.put('/:id', authMiddleware_1.protectAdmin, legalDocumentController_1.legalDocumentController.update);
router.post('/:id/activate', authMiddleware_1.protectAdmin, legalDocumentController_1.legalDocumentController.activate);
// Public routes (for registration)
router.get('/public/active', legalDocumentController_1.legalDocumentController.getActiveDocuments);
router.get('/public/active/:type', legalDocumentController_1.legalDocumentController.getActiveByType);
router.post('/public/accept-during-login', legalDocumentController_1.legalDocumentController.acceptDocumentDuringLogin);
// Agency routes (protected)
router.get('/agency/pending', agencyAuthMiddleware_1.protectAgency, legalDocumentController_1.legalDocumentController.getPendingDocuments);
router.get('/agency/accepted', agencyAuthMiddleware_1.protectAgency, legalDocumentController_1.legalDocumentController.getAcceptedDocuments);
router.get('/agency/:id', agencyAuthMiddleware_1.protectAgency, legalDocumentController_1.legalDocumentController.findById);
router.post('/agency/accept', agencyAuthMiddleware_1.protectAgency, legalDocumentController_1.legalDocumentController.acceptDocument);
exports.default = router;
