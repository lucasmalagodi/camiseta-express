import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Middleware para verificar se é admin
const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
};

// Rotas específicas (devem vir ANTES das rotas dinâmicas)
// IMPORTANTE: A ordem importa! Rotas específicas devem vir antes de rotas com parâmetros
router.get('/latest', protect, requireAdmin, orderController.getLatest);
router.get('/', protect, requireAdmin, orderController.getAll);

// Rotas públicas (agência)
router.post('/agency/:agencyId', orderController.create);
router.get('/agency/:agencyId', orderController.getByAgencyId);
router.get('/agency/:agencyId/product/:productId/purchases', orderController.getProductPurchaseCount);

// Rotas dinâmicas (devem vir por último)
router.get('/:id', orderController.getById);
router.put('/:id/cancel', orderController.cancel);

export default router;
