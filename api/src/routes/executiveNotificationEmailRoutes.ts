import { Router } from 'express';
import { executiveNotificationEmailController } from '../controllers/executiveNotificationEmailController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/executive/:executiveId', executiveNotificationEmailController.getByExecutiveId);
router.get('/:id', executiveNotificationEmailController.getById);
router.post('/', executiveNotificationEmailController.create);
router.put('/:id', executiveNotificationEmailController.update);
router.delete('/:id', executiveNotificationEmailController.delete);

export default router;
