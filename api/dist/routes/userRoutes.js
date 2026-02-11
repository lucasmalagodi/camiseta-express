"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Todas as rotas requerem autenticação
router.use(authMiddleware_1.protect);
// Verificar se é admin (apenas admins podem gerenciar usuários)
router.use((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
});
router.get('/', userController_1.userController.getAll);
router.get('/:id', userController_1.userController.getById);
router.post('/', userController_1.userController.create);
router.put('/:id', userController_1.userController.update);
router.patch('/:id/status', userController_1.userController.updateStatus);
exports.default = router;
