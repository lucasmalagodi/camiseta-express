import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
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

// Rotas do dashboard
router.get('/orders-summary', dashboardController.getOrdersSummary);
router.get('/top-agency-points', dashboardController.getTopAgencyByPoints);
router.get('/top-agency-orders', dashboardController.getTopAgencyByOrders);
router.get('/agency/:id/orders', dashboardController.getAgencyOrders);
router.get('/top-suppliers', dashboardController.getTopSuppliers);
router.get('/products-by-branch', dashboardController.getProductsByBranch);
router.get('/agencies-without-orders', dashboardController.getTopAgenciesWithoutOrders);
router.get('/agencies-not-registered', dashboardController.getTopAgenciesNotRegistered);

export default router;
