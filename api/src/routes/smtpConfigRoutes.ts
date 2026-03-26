import { Router } from 'express';
import { smtpConfigController } from '../controllers/smtpConfigController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(protectAdmin);

router.get('/smtp-config', smtpConfigController.getConfig);
router.post('/smtp-config', smtpConfigController.setConfig);
router.post('/smtp-config/test', smtpConfigController.testConfig);

export default router;
