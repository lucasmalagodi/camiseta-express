"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backupController_1 = require("../controllers/backupController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Todas as rotas requerem autenticação admin
router.use(authMiddleware_1.protectAdmin);
// Log de debug para verificar se as rotas estão sendo registradas
console.log('📦 Backup routes module loaded');
// IMPORTANTE: Rotas específicas devem vir ANTES das rotas com parâmetros
// Listar backups (rota raiz - DEVE vir primeiro)
router.get('/', backupController_1.backupController.listBackups);
// Criar backup manual
router.post('/create', backupController_1.backupController.createManualBackup);
// Download de backup (específica antes de /:id)
router.get('/:id/download', backupController_1.backupController.downloadBackup);
// Validar backup (específica antes de /:id)
router.get('/:id/validate', backupController_1.backupController.validateBackup);
// Obter backup específico (deve vir por último)
router.get('/:id', backupController_1.backupController.getBackup);
// Deletar backup
router.delete('/:id', backupController_1.backupController.deleteBackup);
exports.default = router;
