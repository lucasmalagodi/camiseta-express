"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const executiveNotificationEmailController_1 = require("../controllers/executiveNotificationEmailController");
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
router.get('/executive/:executiveId', executiveNotificationEmailController_1.executiveNotificationEmailController.getByExecutiveId);
router.get('/:id', executiveNotificationEmailController_1.executiveNotificationEmailController.getById);
router.post('/', executiveNotificationEmailController_1.executiveNotificationEmailController.create);
router.put('/:id', executiveNotificationEmailController_1.executiveNotificationEmailController.update);
router.delete('/:id', executiveNotificationEmailController_1.executiveNotificationEmailController.delete);
exports.default = router;
