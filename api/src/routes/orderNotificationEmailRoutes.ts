import { Router } from 'express';
import { orderNotificationEmailController } from '../controllers/orderNotificationEmailController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/', orderNotificationEmailController.getAll);
router.get('/active', orderNotificationEmailController.getActive);
router.get('/:id', orderNotificationEmailController.getById);
router.post('/', orderNotificationEmailController.create);
router.put('/:id', orderNotificationEmailController.update);
router.delete('/:id', orderNotificationEmailController.delete);

export default router;
