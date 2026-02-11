import { Router } from 'express';
import { userController } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(protect);

// Verificar se é admin (apenas admins podem gerenciar usuários)
router.use((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
});

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.patch('/:id/status', userController.updateStatus);

export default router;
