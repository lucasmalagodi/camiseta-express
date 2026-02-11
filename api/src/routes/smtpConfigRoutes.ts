import { Router } from 'express';
import { smtpConfigController } from '../controllers/smtpConfigController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(protect);

// Verificar se é admin
router.use((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
});

router.get('/smtp-config', smtpConfigController.getConfig);
router.post('/smtp-config', smtpConfigController.setConfig);
router.post('/smtp-config/test', smtpConfigController.testConfig);

export default router;
