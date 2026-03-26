import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(protectAdmin);

// Rotas do dashboard
router.get('/orders-summary', dashboardController.getOrdersSummary);
router.get('/top-agency-points', dashboardController.getTopAgencyByPoints);
router.get('/top-agency-orders', dashboardController.getTopAgencyByOrders);
router.get('/agency/:id/orders', dashboardController.getAgencyOrders);
router.get('/top-suppliers', dashboardController.getTopSuppliers);
router.get('/products-by-branch', dashboardController.getProductsByBranch);
router.get('/agencies-without-orders', dashboardController.getTopAgenciesWithoutOrders);
router.get('/agencies-not-registered', dashboardController.getTopAgenciesNotRegistered);
router.get('/products-inventory', dashboardController.getProductsInventory);

export default router;
