import { query } from '../config/db';

export interface OrderNotificationEmail {
    id: number;
    email: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateOrderNotificationEmailDto {
    email: string;
}

export interface UpdateOrderNotificationEmailDto {
    email?: string;
    active?: boolean;
}

export const orderNotificationEmailService = {
    async findAll(): Promise<OrderNotificationEmail[]> {
        const results = await query(
            'SELECT id, email, active, created_at as createdAt, updated_at as updatedAt FROM order_notification_emails ORDER BY created_at DESC'
        ) as OrderNotificationEmail[];

        return Array.isArray(results) ? results : [];
    },

    async findActive(): Promise<OrderNotificationEmail[]> {
        const results = await query(
            'SELECT id, email, active, created_at as createdAt, updated_at as updatedAt FROM order_notification_emails WHERE active = true ORDER BY email ASC'
        ) as OrderNotificationEmail[];

        return Array.isArray(results) ? results : [];
    },

    async findById(id: number): Promise<OrderNotificationEmail | null> {
        const results = await query(
            'SELECT id, email, active, created_at as createdAt, updated_at as updatedAt FROM order_notification_emails WHERE id = ?',
            [id]
        ) as OrderNotificationEmail[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findByEmail(email: string): Promise<OrderNotificationEmail | null> {
        const results = await query(
            'SELECT id, email, active, created_at as createdAt, updated_at as updatedAt FROM order_notification_emails WHERE email = ?',
            [email]
        ) as OrderNotificationEmail[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async create(data: CreateOrderNotificationEmailDto): Promise<number> {
        // Verificar se email já existe
        const existing = await this.findByEmail(data.email);
        if (existing) {
            throw new Error('Email já cadastrado');
        }

        const result = await query(
            'INSERT INTO order_notification_emails (email, active) VALUES (?, true)',
            [data.email.trim().toLowerCase()]
        ) as any;

        return result.insertId;
    },

    async update(id: number, data: UpdateOrderNotificationEmailDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.email !== undefined) {
            // Verificar se email já existe em outro registro
            const existing = await this.findByEmail(data.email);
            if (existing && existing.id !== id) {
                throw new Error('Email já cadastrado em outro registro');
            }
            updates.push('email = ?');
            values.push(data.email.trim().toLowerCase());
        }

        if (data.active !== undefined) {
            updates.push('active = ?');
            values.push(data.active);
        }

        if (updates.length === 0) {
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(id);

        await query(
            `UPDATE order_notification_emails SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    },

    async delete(id: number): Promise<void> {
        await query(
            'DELETE FROM order_notification_emails WHERE id = ?',
            [id]
        );
    },
};
