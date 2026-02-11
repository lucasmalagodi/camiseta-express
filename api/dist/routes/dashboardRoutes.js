"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
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
// Rotas do dashboard
router.get('/orders-summary', dashboardController_1.dashboardController.getOrdersSummary);
router.get('/top-agency-points', dashboardController_1.dashboardController.getTopAgencyByPoints);
router.get('/top-agency-orders', dashboardController_1.dashboardController.getTopAgencyByOrders);
router.get('/agency/:id/orders', dashboardController_1.dashboardController.getAgencyOrders);
router.get('/top-suppliers', dashboardController_1.dashboardController.getTopSuppliers);
router.get('/products-by-branch', dashboardController_1.dashboardController.getProductsByBranch);
router.get('/agencies-without-orders', dashboardController_1.dashboardController.getTopAgenciesWithoutOrders);
router.get('/agencies-not-registered', dashboardController_1.dashboardController.getTopAgenciesNotRegistered);
exports.default = router;
