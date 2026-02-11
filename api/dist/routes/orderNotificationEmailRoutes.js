"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderNotificationEmailController_1 = require("../controllers/orderNotificationEmailController");
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
router.get('/', orderNotificationEmailController_1.orderNotificationEmailController.getAll);
router.get('/active', orderNotificationEmailController_1.orderNotificationEmailController.getActive);
router.get('/:id', orderNotificationEmailController_1.orderNotificationEmailController.getById);
router.post('/', orderNotificationEmailController_1.orderNotificationEmailController.create);
router.put('/:id', orderNotificationEmailController_1.orderNotificationEmailController.update);
router.delete('/:id', orderNotificationEmailController_1.orderNotificationEmailController.delete);
exports.default = router;
