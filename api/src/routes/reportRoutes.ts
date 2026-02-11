import { Router } from 'express';
import { reportController, dashboardWidgetController } from '../controllers/reportController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Middleware para verificar se é admin
const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
};

// Todas as rotas requerem autenticação e admin
router.use(protect);
router.use(requireAdmin);

// Rotas de relatórios
// IMPORTANTE: Rotas específicas devem vir ANTES de rotas com parâmetros
router.post('/reports', reportController.create);
router.get('/reports', reportController.getAll);
router.get('/reports/fields', reportController.getAvailableFields); // Específica antes de /:id
router.post('/reports/preview', reportController.preview); // Específica antes de /:id
router.post('/reports/:id/execute', reportController.execute); // Específica antes de /:id
router.get('/reports/:id', reportController.getById);
router.put('/reports/:id', reportController.update);
router.delete('/reports/:id', reportController.delete);

// Rotas de widgets do dashboard
router.post('/widgets', dashboardWidgetController.create);
router.get('/widgets', dashboardWidgetController.getActive);
router.get('/widgets/:id', dashboardWidgetController.getById);
router.put('/widgets/:id', dashboardWidgetController.update);
router.delete('/widgets/:id', dashboardWidgetController.delete);

export default router;
