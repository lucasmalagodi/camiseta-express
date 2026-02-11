import { Router } from 'express';
import { ticketController } from '../controllers/ticketController';
import { protectAgency } from '../middlewares/agencyAuthMiddleware';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// ========== AGENCY ROUTES ==========
// Criar ticket
router.post('/', protectAgency, ticketController.create);

// Listar tickets da agência
router.get('/agency', protectAgency, ticketController.listAgencyTickets);

// Buscar ticket por ID (agência)
router.get('/agency/:id', protectAgency, ticketController.getTicket);

// Buscar mensagens de um ticket (agência)
router.get('/agency/:id/messages', protectAgency, ticketController.getTicketMessages);

// Adicionar mensagem a um ticket (agência)
router.post('/agency/:id/messages', protectAgency, ticketController.addMessage);

// ========== ADMIN ROUTES ==========
// Middleware para todas as rotas admin
const adminRoutes = Router();
adminRoutes.use(protect);
adminRoutes.use((req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
    }
    next();
});

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
