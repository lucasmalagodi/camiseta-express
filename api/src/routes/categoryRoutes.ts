import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';

const router = Router();

router.post('/', categoryController.create);
router.put('/:id', categoryController.update);
router.delete('/:id', categoryController.delete);
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);

export default router;
