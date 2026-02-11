"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
};
// Rotas específicas (devem vir ANTES das rotas dinâmicas)
// IMPORTANTE: A ordem importa! Rotas específicas devem vir antes de rotas com parâmetros
router.get('/latest', authMiddleware_1.protect, requireAdmin, orderController_1.orderController.getLatest);
router.get('/', authMiddleware_1.protect, requireAdmin, orderController_1.orderController.getAll);
// Rotas públicas (agência)
router.post('/agency/:agencyId', orderController_1.orderController.create);
router.get('/agency/:agencyId', orderController_1.orderController.getByAgencyId);
router.get('/agency/:agencyId/product/:productId/purchases', orderController_1.orderController.getProductPurchaseCount);
// Rotas dinâmicas (devem vir por último)
router.get('/:id', orderController_1.orderController.getById);
router.put('/:id/cancel', orderController_1.orderController.cancel);
exports.default = router;
