import { Router } from 'express';
import { executiveNotificationEmailController } from '../controllers/executiveNotificationEmailController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(protect);

// Verificar se é admin
router.use((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
});

router.get('/executive/:executiveId', executiveNotificationEmailController.getByExecutiveId);
router.get('/:id', executiveNotificationEmailController.getById);
router.post('/', executiveNotificationEmailController.create);
router.put('/:id', executiveNotificationEmailController.update);
router.delete('/:id', executiveNotificationEmailController.delete);

export default router;
