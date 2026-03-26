import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Rotas admin (específicas antes das dinâmicas)
router.get('/latest', protectAdmin, orderController.getLatest);
router.get('/', protectAdmin, orderController.getAll);
router.patch(
  '/:orderId/items/:itemId/variant',
  protectAdmin,
  orderController.updateOrderItemVariant
);

// Rotas públicas (agência)
router.post('/agency/:agencyId', orderController.create);
router.get('/agency/:agencyId', orderController.getByAgencyId);
router.get('/agency/:agencyId/product/:productId/purchases', orderController.getProductPurchaseCount);

// Rotas dinâmicas (devem vir por último)
router.get('/:id', orderController.getById);
router.put('/:id/cancel', protectAdmin, orderController.cancel);

export default router;
