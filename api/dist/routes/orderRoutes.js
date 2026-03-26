"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Rotas admin (específicas antes das dinâmicas)
router.get('/latest', authMiddleware_1.protectAdmin, orderController_1.orderController.getLatest);
router.get('/', authMiddleware_1.protectAdmin, orderController_1.orderController.getAll);
router.patch('/:orderId/items/:itemId/variant', authMiddleware_1.protectAdmin, orderController_1.orderController.updateOrderItemVariant);
// Rotas públicas (agência)
router.post('/agency/:agencyId', orderController_1.orderController.create);
router.get('/agency/:agencyId', orderController_1.orderController.getByAgencyId);
router.get('/agency/:agencyId/product/:productId/purchases', orderController_1.orderController.getProductPurchaseCount);
// Rotas dinâmicas (devem vir por último)
router.get('/:id', orderController_1.orderController.getById);
router.put('/:id/cancel', authMiddleware_1.protectAdmin, orderController_1.orderController.cancel);
exports.default = router;
