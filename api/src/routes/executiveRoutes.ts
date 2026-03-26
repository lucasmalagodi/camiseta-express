import { Router } from 'express';
import { executiveController } from '../controllers/executiveController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/', executiveController.getAll);
router.get('/active', executiveController.getActive);
router.get('/unique-names', executiveController.getUniqueExecutiveNames);
router.get('/:id', executiveController.getById);
router.post('/', executiveController.create);
router.put('/:id', executiveController.update);
router.delete('/:id', executiveController.delete);

export default router;
