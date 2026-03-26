import { Router } from 'express';
import { heroProductController } from '../controllers/heroProductController';
import { uploadController } from '../controllers/uploadController';
import { protectAdmin } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

router.get('/public', heroProductController.getActiveForDisplay);

router.use(protectAdmin);

// Rotas administrativas
router.post('/images/upload/:type', upload.single('image'), uploadController.uploadBannerImage);
router.post('/', heroProductController.create);
router.put('/:id', heroProductController.update);
router.delete('/:id', heroProductController.delete);
router.get('/', heroProductController.getAll);
router.get('/:id', heroProductController.getById);
router.post('/update-order', heroProductController.updateOrder);

export default router;
