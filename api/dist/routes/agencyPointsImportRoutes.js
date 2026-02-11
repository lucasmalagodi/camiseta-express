"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agencyPointsImportController_1 = require("../controllers/agencyPointsImportController");
const spreadsheetUploadMiddleware_1 = require("../middlewares/spreadsheetUploadMiddleware");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Rotas específicas devem vir ANTES de rotas com parâmetros dinâmicos
// Isso evita que Express trate "upload" como um ID
// Aplicar autenticação antes do upload do arquivo
router.post('/upload', authMiddleware_1.protect, spreadsheetUploadMiddleware_1.spreadsheetUpload.single('file'), agencyPointsImportController_1.agencyPointsImportController.upload);
router.get('/cnpj/:cnpj/items', authMiddleware_1.protect, agencyPointsImportController_1.agencyPointsImportController.getItemsByCnpj);
router.get('/:id/status', authMiddleware_1.protect, agencyPointsImportController_1.agencyPointsImportController.getStatus);
router.get('/:id/logs', authMiddleware_1.protect, agencyPointsImportController_1.agencyPointsImportController.getLogs);
router.delete('/:id', authMiddleware_1.protect, agencyPointsImportController_1.agencyPointsImportController.delete);
router.get('/:id', authMiddleware_1.protect, agencyPointsImportController_1.agencyPointsImportController.getById);
// Rotas gerais por último
router.post('/', authMiddleware_1.protect, agencyPointsImportController_1.agencyPointsImportController.create);
router.get('/', authMiddleware_1.protect, agencyPointsImportController_1.agencyPointsImportController.getAll);
exports.default = router;
