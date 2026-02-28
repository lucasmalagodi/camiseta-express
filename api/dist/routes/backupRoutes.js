"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backupController_1 = require("../controllers/backupController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Todas as rotas requerem autenticação admin
router.use(authMiddleware_1.protectAdmin);
// IMPORTANTE: Rotas específicas devem vir ANTES das rotas com parâmetros
// Criar backup manual
router.post('/create', backupController_1.backupController.createManualBackup);
// Download de backup (específica antes de /:id)
router.get('/:id/download', backupController_1.backupController.downloadBackup);
// Validar backup (específica antes de /:id)
router.get('/:id/validate', backupController_1.backupController.validateBackup);
// Listar backups (rota raiz)
router.get('/', backupController_1.backupController.listBackups);
// Obter backup específico (deve vir por último)
router.get('/:id', backupController_1.backupController.getBackup);
// Deletar backup
router.delete('/:id', backupController_1.backupController.deleteBackup);
exports.default = router;
