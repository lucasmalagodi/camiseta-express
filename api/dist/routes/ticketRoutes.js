"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticketController_1 = require("../controllers/ticketController");
const agencyAuthMiddleware_1 = require("../middlewares/agencyAuthMiddleware");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// ========== AGENCY ROUTES ==========
router.post('/', agencyAuthMiddleware_1.protectAgency, ticketController_1.ticketController.create);
router.get('/agency', agencyAuthMiddleware_1.protectAgency, ticketController_1.ticketController.listAgencyTickets);
router.get('/agency/:id', agencyAuthMiddleware_1.protectAgency, ticketController_1.ticketController.getTicket);
router.get('/agency/:id/messages', agencyAuthMiddleware_1.protectAgency, ticketController_1.ticketController.getTicketMessages);
router.post('/agency/:id/messages', agencyAuthMiddleware_1.protectAgency, ticketController_1.ticketController.addMessage);
// ========== ADMIN ROUTES ==========
const adminRoutes = (0, express_1.Router)();
adminRoutes.use(authMiddleware_1.protectAdmin);
// Listar todos os tickets (admin) - deve vir antes de /:id
adminRoutes.get('/', ticketController_1.ticketController.listAllTickets);
// Buscar mensagens de um ticket (admin) - deve vir antes de /:id
adminRoutes.get('/:id/messages', ticketController_1.ticketController.getTicketMessagesAdmin);
// Adicionar mensagem a um ticket (admin) - deve vir antes de /:id
adminRoutes.post('/:id/messages', ticketController_1.ticketController.addMessageAdmin);
// Fechar ticket (admin) - deve vir antes de /:id
adminRoutes.post('/:id/close', ticketController_1.ticketController.closeTicket);
// Buscar ticket por ID (admin) - deve vir por último
adminRoutes.get('/:id', ticketController_1.ticketController.getTicketAdmin);
// Montar rotas admin
router.use('/admin', adminRoutes);
exports.default = router;
