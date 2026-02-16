import { Router } from 'express';
import { agencyController } from '../controllers/agencyController';
import { agencyPointsLedgerController } from '../controllers/agencyPointsLedgerController';
import { agencyPointsController } from '../controllers/agencyPointsController';
import { orderController } from '../controllers/orderController';
import { protectAgency } from '../middlewares/agencyAuthMiddleware';

const router = Router();

// Registration endpoints (must come before /:id routes)
router.post('/validate-cnpj', agencyController.validateCnpj);
router.post('/register', agencyController.register);
router.post('/login', agencyController.login);
router.post('/verify-code', agencyController.verifyCode);

// Authenticated agency endpoints (requires JWT token)
router.get('/points/summary', protectAgency, agencyPointsController.getPointsSummary);

// Profile endpoints for authenticated agencies
router.get('/me', protectAgency, agencyController.getMe);
router.put('/me', protectAgency, agencyController.updateMe);
router.post('/me/change-password', protectAgency, agencyController.changePassword);

// Order history endpoints for authenticated agencies (must come before /:id routes)
router.get('/me/orders', protectAgency, orderController.getMyOrders);
router.get('/me/orders/:id', protectAgency, orderController.getMyOrderById);

// CRUD endpoints
router.post('/', agencyController.create);
router.put('/:id', agencyController.update);
router.delete('/:id', agencyController.delete);
router.get('/', agencyController.getAll);
router.get('/:id', agencyController.getById);
router.get('/:id/balance', agencyController.getBalance);

// Ledger sub-resource
router.get('/:agencyId/ledger', agencyPointsLedgerController.getByAgencyId);
router.get('/:agencyId/ledger/balance', agencyPointsLedgerController.getBalance);

export default router;
