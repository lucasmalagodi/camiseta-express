"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const heroProductController_1 = require("../controllers/heroProductController");
const uploadController_1 = require("../controllers/uploadController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = (0, express_1.Router)();
router.get('/public', heroProductController_1.heroProductController.getActiveForDisplay);
router.use(authMiddleware_1.protectAdmin);
// Rotas administrativas
router.post('/images/upload/:type', uploadMiddleware_1.upload.single('image'), uploadController_1.uploadController.uploadBannerImage);
router.post('/', heroProductController_1.heroProductController.create);
router.put('/:id', heroProductController_1.heroProductController.update);
router.delete('/:id', heroProductController_1.heroProductController.delete);
router.get('/', heroProductController_1.heroProductController.getAll);
router.get('/:id', heroProductController_1.heroProductController.getById);
router.post('/update-order', heroProductController_1.heroProductController.updateOrder);
exports.default = router;
