"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sizeChartController_1 = require("../controllers/sizeChartController");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Rotas públicas (sem autenticação) - para o frontend acessar
router.get('/model/:model', sizeChartController_1.sizeChartController.getByModel);
router.get('/:id', sizeChartController_1.sizeChartController.getById);
// Todas as outras rotas requerem autenticação de admin
router.use(authMiddleware_1.protectAdmin);
// Size Chart routes protegidas
router.get('/', sizeChartController_1.sizeChartController.getAll);
router.post('/', sizeChartController_1.sizeChartController.create);
router.put('/:id', sizeChartController_1.sizeChartController.update);
router.delete('/:id', sizeChartController_1.sizeChartController.delete);
router.post('/:id/image', uploadMiddleware_1.upload.single('image'), sizeChartController_1.sizeChartController.uploadImage);
exports.default = router;
