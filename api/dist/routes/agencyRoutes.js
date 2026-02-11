"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agencyController_1 = require("../controllers/agencyController");
const agencyPointsLedgerController_1 = require("../controllers/agencyPointsLedgerController");
const agencyPointsController_1 = require("../controllers/agencyPointsController");
const agencyAuthMiddleware_1 = require("../middlewares/agencyAuthMiddleware");
const router = (0, express_1.Router)();
// Registration endpoints (must come before /:id routes)
router.post('/validate-cnpj', agencyController_1.agencyController.validateCnpj);
router.post('/register', agencyController_1.agencyController.register);
router.post('/login', agencyController_1.agencyController.login);
// Authenticated agency endpoints (requires JWT token)
router.get('/points/summary', agencyAuthMiddleware_1.protectAgency, agencyPointsController_1.agencyPointsController.getPointsSummary);
// CRUD endpoints
router.post('/', agencyController_1.agencyController.create);
router.put('/:id', agencyController_1.agencyController.update);
router.delete('/:id', agencyController_1.agencyController.delete);
router.get('/', agencyController_1.agencyController.getAll);
router.get('/:id', agencyController_1.agencyController.getById);
router.get('/:id/balance', agencyController_1.agencyController.getBalance);
// Ledger sub-resource
router.get('/:agencyId/ledger', agencyPointsLedgerController_1.agencyPointsLedgerController.getByAgencyId);
router.get('/:agencyId/ledger/balance', agencyPointsLedgerController_1.agencyPointsLedgerController.getBalance);
exports.default = router;
