"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketController = void 0;
const zod_1 = require("zod");
const ticketService_1 = require("../services/ticketService");
const emailService_1 = require("../services/emailService");
const agencyService_1 = require("../services/agencyService");
const createTicketSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1, 'Assunto é obrigatório'),
    message: zod_1.z.string().min(1, 'Mensagem é obrigatória')
});
const addMessageSchema = zod_1.z.object({
    message: zod_1.z.string().min(1, 'Mensagem é obrigatória')
});
const closeTicketSchema = zod_1.z.object({
    ticket_id: zod_1.z.number()
});
exports.ticketController = {
    // Criar ticket (agência)
    async create(req, res) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Não autorizado' });
            }
            const data = createTicketSchema.parse(req.body);
            const ticketId = await ticketService_1.ticketService.create({
                agency_id: req.agency.id,
                subject: data.subject,
                message: data.message
            });
            // Buscar ticket criado para enviar email
            const ticket = await ticketService_1.ticketService.findById(ticketId, req.agency.id);
            if (ticket) {
                // Buscar dados da agência
                const agency = await agencyService_1.agencyService.findById(req.agency.id);
                // Enviar email de notificação
                try {
                    await emailService_1.emailService.sendTicketCreatedNotification(ticketId, data.subject, data.message, agency?.email || '', agency?.name || 'Agência');
                }
                catch (emailError) {
                    console.error('Erro ao enviar email de criação de ticket:', emailError);
                    // Não falhar a criação do ticket se o email falhar
                }
            }
            res.status(201).json({
                id: ticketId,
                message: 'Ticket criado com sucesso'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    message: 'Dados inválidos',
                    errors: error.issues
                });
            }
            console.error('Erro ao criar ticket:', error);
            res.status(500).json({ message: 'Erro ao criar ticket' });
        }
    },
    // Listar tickets da agência
    async listAgencyTickets(req, res) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Não autorizado' });
            }
            const tickets = await ticketService_1.ticketService.findByAgency(req.agency.id);
            res.status(200).json(tickets);
        }
        catch (error) {
            console.error('Erro ao listar tickets:', error);
            res.status(500).json({ message: 'Erro ao listar tickets' });
        }
    },
    // Buscar ticket por ID (agência)
    async getTicket(req, res) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Não autorizado' });
            }
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticketId = parseInt(idParam);
            if (isNaN(ticketId)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const ticket = await ticketService_1.ticketService.findById(ticketId, req.agency.id);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket não encontrado' });
            }
            res.status(200).json(ticket);
        }
        catch (error) {
            console.error('Erro ao buscar ticket:', error);
            res.status(500).json({ message: 'Erro ao buscar ticket' });
        }
    },
    // Buscar mensagens de um ticket (agência)
    async getTicketMessages(req, res) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Não autorizado' });
            }
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticketId = parseInt(idParam);
            if (isNaN(ticketId)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const messages = await ticketService_1.ticketService.findMessagesByTicketId(ticketId, req.agency.id);
            res.status(200).json(messages);
        }
        catch (error) {
            console.error('Erro ao buscar mensagens:', error);
            if (error.message === 'Ticket not found or access denied') {
                return res.status(404).json({ message: 'Ticket não encontrado ou acesso negado' });
            }
            res.status(500).json({ message: 'Erro ao buscar mensagens' });
        }
    },
    // Adicionar mensagem a um ticket (agência)
    async addMessage(req, res) {
        try {
            if (!req.agency) {
                return res.status(401).json({ message: 'Não autorizado' });
            }
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticketId = parseInt(idParam);
            if (isNaN(ticketId)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const data = addMessageSchema.parse(req.body);
            // Verificar se o ticket pertence à agência
            const ticket = await ticketService_1.ticketService.findById(ticketId, req.agency.id);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket não encontrado' });
            }
            if (ticket.status === 'CLOSED') {
                return res.status(400).json({ message: 'Não é possível responder a um ticket fechado' });
            }
            await ticketService_1.ticketService.addMessage({
                ticket_id: ticketId,
                sender_type: 'AGENCY',
                sender_id: req.agency.id,
                message: data.message
            });
            res.status(201).json({ message: 'Mensagem adicionada com sucesso' });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    message: 'Dados inválidos',
                    errors: error.issues
                });
            }
            console.error('Erro ao adicionar mensagem:', error);
            if (error.message === 'Cannot add message to closed ticket') {
                return res.status(400).json({ message: 'Não é possível adicionar mensagem a um ticket fechado' });
            }
            res.status(500).json({ message: 'Erro ao adicionar mensagem' });
        }
    },
    // ========== ADMIN ENDPOINTS ==========
    // Listar todos os tickets (admin)
    async listAllTickets(req, res) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acesso negado' });
            }
            const status = req.query.status;
            const agencyId = req.query.agency_id ? parseInt(req.query.agency_id) : undefined;
            const filters = {};
            if (status)
                filters.status = status;
            if (agencyId && !isNaN(agencyId))
                filters.agency_id = agencyId;
            const tickets = await ticketService_1.ticketService.findAll(filters);
            res.status(200).json(tickets);
        }
        catch (error) {
            console.error('Erro ao listar tickets:', error);
            res.status(500).json({ message: 'Erro ao listar tickets' });
        }
    },
    // Buscar ticket por ID (admin)
    async getTicketAdmin(req, res) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acesso negado' });
            }
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticketId = parseInt(idParam);
            if (isNaN(ticketId)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const ticket = await ticketService_1.ticketService.findById(ticketId, undefined, true);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket não encontrado' });
            }
            res.status(200).json(ticket);
        }
        catch (error) {
            console.error('Erro ao buscar ticket:', error);
            res.status(500).json({ message: 'Erro ao buscar ticket' });
        }
    },
    // Buscar mensagens de um ticket (admin)
    async getTicketMessagesAdmin(req, res) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acesso negado' });
            }
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticketId = parseInt(idParam);
            if (isNaN(ticketId)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const messages = await ticketService_1.ticketService.findMessagesByTicketId(ticketId, undefined, true);
            res.status(200).json(messages);
        }
        catch (error) {
            console.error('Erro ao buscar mensagens:', error);
            if (error.message === 'Ticket not found or access denied') {
                return res.status(404).json({ message: 'Ticket não encontrado' });
            }
            res.status(500).json({ message: 'Erro ao buscar mensagens' });
        }
    },
    // Adicionar mensagem a um ticket (admin)
    async addMessageAdmin(req, res) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acesso negado' });
            }
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticketId = parseInt(idParam);
            if (isNaN(ticketId)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const data = addMessageSchema.parse(req.body);
            // Verificar se o ticket existe
            const ticket = await ticketService_1.ticketService.findById(ticketId, undefined, true);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket não encontrado' });
            }
            if (ticket.status === 'CLOSED') {
                return res.status(400).json({ message: 'Não é possível responder a um ticket fechado' });
            }
            await ticketService_1.ticketService.addMessage({
                ticket_id: ticketId,
                sender_type: 'ADMIN',
                sender_id: req.user.id,
                message: data.message
            });
            // Enviar email de notificação para a agência
            try {
                await emailService_1.emailService.sendTicketReplyNotification(ticketId, ticket.subject, data.message, ticket.agency_email || '', ticket.agency_name || 'Agência');
            }
            catch (emailError) {
                console.error('Erro ao enviar email de resposta:', emailError);
                // Não falhar a resposta se o email falhar
            }
            res.status(201).json({ message: 'Mensagem adicionada com sucesso' });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    message: 'Dados inválidos',
                    errors: error.issues
                });
            }
            console.error('Erro ao adicionar mensagem:', error);
            if (error.message === 'Cannot add message to closed ticket') {
                return res.status(400).json({ message: 'Não é possível adicionar mensagem a um ticket fechado' });
            }
            res.status(500).json({ message: 'Erro ao adicionar mensagem' });
        }
    },
    // Fechar ticket (admin)
    async closeTicket(req, res) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acesso negado' });
            }
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticketId = parseInt(idParam);
            if (isNaN(ticketId)) {
                return res.status(400).json({ message: 'ID inválido' });
            }
            const ticket = await ticketService_1.ticketService.findById(ticketId, undefined, true);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket não encontrado' });
            }
            await ticketService_1.ticketService.closeTicket(ticketId);
            res.status(200).json({ message: 'Ticket fechado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao fechar ticket:', error);
            res.status(500).json({ message: 'Erro ao fechar ticket' });
        }
    }
};
