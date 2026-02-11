import { Router } from 'express';
import { utilsController } from '../controllers/utilsController';

const router = Router();

router.get('/cep/:cep', utilsController.searchCep);

export default router;
