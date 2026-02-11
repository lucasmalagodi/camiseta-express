"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const smtpConfigController_1 = require("../controllers/smtpConfigController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Todas as rotas requerem autenticação
router.use(authMiddleware_1.protect);
// Verificar se é admin
router.use((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
});
router.get('/smtp-config', smtpConfigController_1.smtpConfigController.getConfig);
router.post('/smtp-config', smtpConfigController_1.smtpConfigController.setConfig);
router.post('/smtp-config/test', smtpConfigController_1.smtpConfigController.testConfig);
exports.default = router;
