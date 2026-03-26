import { Router } from 'express';
import { branchController } from '../controllers/branchController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/', branchController.getAll);
router.get('/unique-names', branchController.getUniqueBranchNames);
router.get('/:id', branchController.getById);
router.post('/', branchController.create);
router.put('/:id', branchController.update);
router.delete('/:id', branchController.delete);

export default router;
