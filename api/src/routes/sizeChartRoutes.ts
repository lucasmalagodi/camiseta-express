import { Router } from 'express';
import { sizeChartController } from '../controllers/sizeChartController';
import { upload } from '../middlewares/uploadMiddleware';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Rotas públicas (sem autenticação) - para o frontend acessar
router.get('/model/:model', sizeChartController.getByModel);
router.get('/:id', sizeChartController.getById);

// Todas as outras rotas requerem autenticação de admin
router.use(protectAdmin);

// Size Chart routes protegidas
router.get('/', sizeChartController.getAll);
router.post('/', sizeChartController.create);
router.put('/:id', sizeChartController.update);
router.delete('/:id', sizeChartController.delete);
router.post('/:id/image', upload.single('image'), sizeChartController.uploadImage);

export default router;
