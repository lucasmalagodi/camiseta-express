import { Router } from 'express';
import { ticketController } from '../controllers/ticketController';
import { protectAgency } from '../middlewares/agencyAuthMiddleware';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

// ========== AGENCY ROUTES ==========
router.post('/', protectAgency, ticketController.create);
router.get('/agency', protectAgency, ticketController.listAgencyTickets);
router.get('/agency/:id', protectAgency, ticketController.getTicket);
router.get('/agency/:id/messages', protectAgency, ticketController.getTicketMessages);
router.post('/agency/:id/messages', protectAgency, ticketController.addMessage);

// ========== ADMIN ROUTES ==========
const adminRoutes = Router();
adminRoutes.use(protectAdmin);

// Listar todos os tickets (admin) - deve vir antes de /:id
adminRoutes.get('/', ticketController.listAllTickets);

// Buscar mensagens de um ticket (admin) - deve vir antes de /:id
adminRoutes.get('/:id/messages', ticketController.getTicketMessagesAdmin);

// Adicionar mensagem a um ticket (admin) - deve vir antes de /:id
adminRoutes.post('/:id/messages', ticketController.addMessageAdmin);

// Fechar ticket (admin) - deve vir antes de /:id
adminRoutes.post('/:id/close', ticketController.closeTicket);

// Buscar ticket por ID (admin) - deve vir por último
adminRoutes.get('/:id', ticketController.getTicketAdmin);

// Montar rotas admin
router.use('/admin', adminRoutes);

export default router;
