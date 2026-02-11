import { Router } from 'express';
import { productController } from '../controllers/productController';
import { productImageController } from '../controllers/productImageController';
import { productPriceController } from '../controllers/productPriceController';
import { uploadController } from '../controllers/uploadController';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

// Product routes
router.post('/', productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.delete);
router.get('/', productController.getAll);
router.get('/:id/details', productController.getByIdWithDetails); // Endpoint otimizado com detalhes
router.get('/:id', productController.getById);

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

export default router;
