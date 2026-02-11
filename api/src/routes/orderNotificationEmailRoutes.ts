import { Router } from 'express';
import { orderNotificationEmailController } from '../controllers/orderNotificationEmailController';
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

router.get('/', orderNotificationEmailController.getAll);
router.get('/active', orderNotificationEmailController.getActive);
router.get('/:id', orderNotificationEmailController.getById);
router.post('/', orderNotificationEmailController.create);
router.put('/:id', orderNotificationEmailController.update);
router.delete('/:id', orderNotificationEmailController.delete);

export default router;
