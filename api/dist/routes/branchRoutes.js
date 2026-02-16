"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const branchController_1 = require("../controllers/branchController");
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
router.get('/', branchController_1.branchController.getAll);
router.get('/unique-names', branchController_1.branchController.getUniqueBranchNames);
router.get('/:id', branchController_1.branchController.getById);
router.post('/', branchController_1.branchController.create);
router.put('/:id', branchController_1.branchController.update);
router.delete('/:id', branchController_1.branchController.delete);
exports.default = router;
