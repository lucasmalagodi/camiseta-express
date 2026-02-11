import { Router } from 'express';
import { agencyController } from '../controllers/agencyController';
import { agencyPointsLedgerController } from '../controllers/agencyPointsLedgerController';
import { agencyPointsController } from '../controllers/agencyPointsController';
import { protectAgency } from '../middlewares/agencyAuthMiddleware';

const router = Router();

// Registration endpoints (must come before /:id routes)
router.post('/validate-cnpj', agencyController.validateCnpj);
router.post('/register', agencyController.register);
router.post('/login', agencyController.login);

// Authenticated agency endpoints (requires JWT token)
router.get('/points/summary', protectAgency, agencyPointsController.getPointsSummary);

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
