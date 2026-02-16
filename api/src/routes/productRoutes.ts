import { Router } from 'express';
import { productController } from '../controllers/productController';
import { productImageController } from '../controllers/productImageController';
import { productPriceController } from '../controllers/productPriceController';
import { productVariantController } from '../controllers/productVariantController';
import { uploadController } from '../controllers/uploadController';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

// Product routes
// IMPORTANTE: Rotas mais específicas devem vir ANTES das rotas genéricas
router.post('/', productController.create);
router.get('/', productController.getAll);

// Rotas específicas primeiro (antes de /:id genérico)
router.get('/:id/details', productController.getByIdWithDetails); // Endpoint otimizado com detalhes

// Product Images sub-resource
router.post('/:id/images/upload', upload.single('image'), uploadController.uploadProductImage);
router.post('/:id/images', productImageController.create);
router.put('/:id/images/:imageId', productImageController.update);
router.delete('/:id/images/:imageId', productImageController.delete);
router.get('/:id/images', productImageController.getAll);
router.post('/:id/images/update-order', productImageController.updateOrder);

// Product Prices sub-resource
router.post('/:id/prices', productPriceController.create);
router.put('/:id/prices/:priceId', productPriceController.update);
router.delete('/:id/prices/:priceId', productPriceController.delete);
router.get('/:id/prices', productPriceController.getAll);

// Product Variants sub-resource
router.post('/:id/variants', productVariantController.create);
router.put('/:id/variants/:variantId', productVariantController.update);
router.delete('/:id/variants/:variantId', productVariantController.delete);
router.get('/:id/variants', productVariantController.getAll);

// Rotas genéricas por último (para não capturar rotas específicas)
router.put('/:id', productController.update);
router.delete('/:id', productController.delete);
router.get('/:id', productController.getById);

export default router;
