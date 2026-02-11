import { Router } from 'express';
import { executiveController } from '../controllers/executiveController';
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

router.get('/', executiveController.getAll);
router.get('/active', executiveController.getActive);
router.get('/unique-names', executiveController.getUniqueExecutiveNames);
router.get('/:id', executiveController.getById);
router.post('/', executiveController.create);
router.put('/:id', executiveController.update);
router.delete('/:id', executiveController.delete);

export default router;
