"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportController_1 = require("../controllers/reportController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
};
// Todas as rotas requerem autenticação e admin
router.use(authMiddleware_1.protect);
router.use(requireAdmin);
// Rotas de relatórios
// IMPORTANTE: Rotas específicas devem vir ANTES de rotas com parâmetros
router.post('/reports', reportController_1.reportController.create);
router.get('/reports', reportController_1.reportController.getAll);
router.get('/reports/fields', reportController_1.reportController.getAvailableFields); // Específica antes de /:id
router.post('/reports/preview', reportController_1.reportController.preview); // Específica antes de /:id
router.post('/reports/:id/execute', reportController_1.reportController.execute); // Específica antes de /:id
router.get('/reports/:id', reportController_1.reportController.getById);
router.put('/reports/:id', reportController_1.reportController.update);
router.delete('/reports/:id', reportController_1.reportController.delete);
// Rotas de widgets do dashboard
router.post('/widgets', reportController_1.dashboardWidgetController.create);
router.get('/widgets', reportController_1.dashboardWidgetController.getActive);
router.get('/widgets/:id', reportController_1.dashboardWidgetController.getById);
router.put('/widgets/:id', reportController_1.dashboardWidgetController.update);
router.delete('/widgets/:id', reportController_1.dashboardWidgetController.delete);
exports.default = router;
