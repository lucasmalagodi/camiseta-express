import { query, pool } from '../config/db';

export interface Ticket {
    id: number;
    agency_id: number;
    agency_name?: string;
    agency_email?: string;
    subject: string;
    status: 'OPEN' | 'ANSWERED' | 'CLOSED';
    created_at: Date;
    updated_at: Date;
    message_count?: number;
    last_message_at?: Date;
}

export interface TicketMessage {
    id: number;
    ticket_id: number;
    sender_type: 'AGENCY' | 'ADMIN';
    sender_id: number;
    sender_name?: string;
    message: string;
    created_at: Date;
}

export interface CreateTicketDto {
    agency_id: number;
    subject: string;
    message: string;
}

export interface CreateTicketMessageDto {
    ticket_id: number;
    sender_type: 'AGENCY' | 'ADMIN';
    sender_id: number;
    message: string;
}

export const ticketService = {
    // Criar novo ticket com primeira mensagem
    async create(data: CreateTicketDto): Promise<number> {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Criar ticket
            const [ticketResult] = await connection.execute(
                'INSERT INTO tickets (agency_id, subject, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                [data.agency_id, data.subject, 'OPEN']
            ) as any;

            const ticketId = ticketResult.insertId;

            // Criar primeira mensagem
            await connection.execute(
                'INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, created_at) VALUES (?, ?, ?, ?, NOW())',
                [ticketId, 'AGENCY', data.agency_id, data.message]
            );

            await connection.commit();
            return ticketId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Buscar ticket por ID (com verificação de acesso)
    async findById(id: number, agencyId?: number, isAdmin: boolean = false): Promise<Ticket | null> {
        let sql = `
            SELECT 
                t.*,
                a.name as agency_name,
                a.email as agency_email,
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
                (SELECT MAX(created_at) FROM ticket_messages WHERE ticket_id = t.id) as last_message_at
            FROM tickets t
            LEFT JOIN agencies a ON t.agency_id = a.id
            WHERE t.id = ?
        `;
        const params: any[] = [id];

        // Se não for admin, verificar se o ticket pertence à agência
        if (!isAdmin && agencyId) {
            sql += ' AND t.agency_id = ?';
            params.push(agencyId);
        }

        const results = await query(sql, params) as Ticket[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    // Listar tickets de uma agência
    async findByAgency(agencyId: number): Promise<Ticket[]> {
        const results = await query(
            `SELECT 
                t.*,
                a.name as agency_name,
                a.email as agency_email,
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
                (SELECT MAX(created_at) FROM ticket_messages WHERE ticket_id = t.id) as last_message_at
            FROM tickets t
            LEFT JOIN agencies a ON t.agency_id = a.id
            WHERE t.agency_id = ?
            ORDER BY t.updated_at DESC`,
            [agencyId]
        ) as Ticket[];

        return Array.isArray(results) ? results : [];
    },

    // Listar todos os tickets (admin)
    async findAll(filters?: { status?: string; agency_id?: number }): Promise<Ticket[]> {
        let sql = `
            SELECT 
                t.*,
                a.name as agency_name,
                a.email as agency_email,
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
                (SELECT MAX(created_at) FROM ticket_messages WHERE ticket_id = t.id) as last_message_at
            FROM tickets t
            LEFT JOIN agencies a ON t.agency_id = a.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (filters?.status) {
            sql += ' AND t.status = ?';
            params.push(filters.status);
        }

        if (filters?.agency_id) {
            sql += ' AND t.agency_id = ?';
            params.push(filters.agency_id);
        }

        sql += ' ORDER BY t.updated_at DESC';

        const results = await query(sql, params) as Ticket[];

        return Array.isArray(results) ? results : [];
    },

    // Buscar mensagens de um ticket
    async findMessagesByTicketId(ticketId: number, agencyId?: number, isAdmin: boolean = false): Promise<TicketMessage[]> {
        // Verificar acesso ao ticket primeiro
        const ticket = await this.findById(ticketId, agencyId, isAdmin);
        if (!ticket) {
            throw new Error('Ticket not found or access denied');
        }

        const results = await query(
            `SELECT 
                tm.*,
                CASE 
                    WHEN tm.sender_type = 'AGENCY' THEN a.name
                    WHEN tm.sender_type = 'ADMIN' THEN u.name
                    ELSE NULL
                END as sender_name
            FROM ticket_messages tm
            LEFT JOIN agencies a ON tm.sender_type = 'AGENCY' AND tm.sender_id = a.id
            LEFT JOIN users u ON tm.sender_type = 'ADMIN' AND tm.sender_id = u.id
            WHERE tm.ticket_id = ?
            ORDER BY tm.created_at ASC`,
            [ticketId]
        ) as TicketMessage[];

        return Array.isArray(results) ? results : [];
    },

    // Adicionar mensagem a um ticket
    async addMessage(data: CreateTicketMessageDto): Promise<number> {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Verificar se o ticket existe e não está fechado
            const [ticketRows] = await connection.execute(
                'SELECT status FROM tickets WHERE id = ?',
                [data.ticket_id]
            ) as any[];

            if (!Array.isArray(ticketRows) || ticketRows.length === 0) {
                throw new Error('Ticket not found');
            }

            const ticket = ticketRows[0];
            if (ticket.status === 'CLOSED') {
                throw new Error('Cannot add message to closed ticket');
            }

            // Adicionar mensagem
            const [result] = await connection.execute(
                'INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, created_at) VALUES (?, ?, ?, ?, NOW())',
                [data.ticket_id, data.sender_type, data.sender_id, data.message]
            ) as any;

            const messageId = result.insertId;

            // Atualizar status do ticket
            let newStatus = ticket.status;
            if (data.sender_type === 'ADMIN' && ticket.status === 'OPEN') {
                newStatus = 'ANSWERED';
            } else if (data.sender_type === 'AGENCY' && ticket.status === 'ANSWERED') {
                newStatus = 'OPEN';
            }

            await connection.execute(
                'UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?',
                [newStatus, data.ticket_id]
            );

            await connection.commit();
            return messageId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Fechar ticket (apenas admin)
    async closeTicket(ticketId: number): Promise<void> {
        await query(
            'UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?',
            ['CLOSED', ticketId]
        );
    }
};
