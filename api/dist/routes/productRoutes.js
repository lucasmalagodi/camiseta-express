"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const productImageController_1 = require("../controllers/productImageController");
const productPriceController_1 = require("../controllers/productPriceController");
const uploadController_1 = require("../controllers/uploadController");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = (0, express_1.Router)();
// Product routes
router.post('/', productController_1.productController.create);
router.put('/:id', productController_1.productController.update);
router.delete('/:id', productController_1.productController.delete);
router.get('/', productController_1.productController.getAll);
router.get('/:id/details', productController_1.productController.getByIdWithDetails); // Endpoint otimizado com detalhes
router.get('/:id', productController_1.productController.getById);
// Product Images sub-resource
router.post('/:id/images/upload', uploadMiddleware_1.upload.single('image'), uploadController_1.uploadController.uploadProductImage);
router.post('/:id/images', productImageController_1.productImageController.create);
router.put('/:id/images/:imageId', productImageController_1.productImageController.update);
router.delete('/:id/images/:imageId', productImageController_1.productImageController.delete);
router.get('/:id/images', productImageController_1.productImageController.getAll);
router.post('/:id/images/update-order', productImageController_1.productImageController.updateOrder);
// Product Prices sub-resource
router.post('/:id/prices', productPriceController_1.productPriceController.create);
router.put('/:id/prices/:priceId', productPriceController_1.productPriceController.update);
router.delete('/:id/prices/:priceId', productPriceController_1.productPriceController.delete);
router.get('/:id/prices', productPriceController_1.productPriceController.getAll);
exports.default = router;
