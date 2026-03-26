import { Router } from 'express';
import { userController } from '../controllers/userController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.patch('/:id/status', userController.updateStatus);

export default router;
