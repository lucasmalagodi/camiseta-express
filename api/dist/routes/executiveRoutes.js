"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const executiveController_1 = require("../controllers/executiveController");
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
router.get('/', executiveController_1.executiveController.getAll);
router.get('/active', executiveController_1.executiveController.getActive);
router.get('/unique-names', executiveController_1.executiveController.getUniqueExecutiveNames);
router.get('/:id', executiveController_1.executiveController.getById);
router.post('/', executiveController_1.executiveController.create);
router.put('/:id', executiveController_1.executiveController.update);
router.delete('/:id', executiveController_1.executiveController.delete);
exports.default = router;
