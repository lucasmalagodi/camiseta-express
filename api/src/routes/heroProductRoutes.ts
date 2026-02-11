import { Router } from 'express';
import { heroProductController } from '../controllers/heroProductController';
import { uploadController } from '../controllers/uploadController';
import { protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

// Rota pública para buscar produtos em destaque (sem autenticação)
router.get('/public', heroProductController.getActiveForDisplay);

// Todas as outras rotas requerem autenticação de admin
router.use(protect);

// Verificar se é admin
router.use((req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
});

// Rotas administrativas
router.post('/images/upload/:type', upload.single('image'), uploadController.uploadBannerImage);
router.post('/', heroProductController.create);
router.put('/:id', heroProductController.update);
router.delete('/:id', heroProductController.delete);
router.get('/', heroProductController.getAll);
router.get('/:id', heroProductController.getById);
router.post('/update-order', heroProductController.updateOrder);

export default router;
