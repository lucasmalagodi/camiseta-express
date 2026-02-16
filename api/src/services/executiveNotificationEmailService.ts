import { query } from '../config/db';

export interface ExecutiveNotificationEmail {
    id: number;
    executiveId: number;
    email: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateExecutiveNotificationEmailDto {
    executiveId: number;
    email: string;
}

export interface UpdateExecutiveNotificationEmailDto {
    email?: string;
    active?: boolean;
}

export const executiveNotificationEmailService = {
    async findByExecutiveId(executiveId: number): Promise<ExecutiveNotificationEmail[]> {
        const results = await query(
            'SELECT id, executive_id as executiveId, email, active, created_at as createdAt, updated_at as updatedAt FROM executive_notification_emails WHERE executive_id = ? ORDER BY created_at ASC',
            [executiveId]
        ) as ExecutiveNotificationEmail[];

        return Array.isArray(results) ? results : [];
    },

    async findActiveByExecutiveId(executiveId: number): Promise<ExecutiveNotificationEmail[]> {
        const results = await query(
            'SELECT id, executive_id as executiveId, email, active, created_at as createdAt, updated_at as updatedAt FROM executive_notification_emails WHERE executive_id = ? AND active = true ORDER BY created_at ASC',
            [executiveId]
        ) as ExecutiveNotificationEmail[];

        return Array.isArray(results) ? results : [];
    },

    async findById(id: number): Promise<ExecutiveNotificationEmail | null> {
        const results = await query(
            'SELECT id, executive_id as executiveId, email, active, created_at as createdAt, updated_at as updatedAt FROM executive_notification_emails WHERE id = ?',
            [id]
        ) as ExecutiveNotificationEmail[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async create(data: CreateExecutiveNotificationEmailDto): Promise<number> {
        // Verificar se email já existe para este executivo
        const existing = await query(
            'SELECT id FROM executive_notification_emails WHERE executive_id = ? AND email = ?',
            [data.executiveId, data.email.trim().toLowerCase()]
        ) as any[];

        if (Array.isArray(existing) && existing.length > 0) {
            throw new Error('Email já cadastrado para este executivo');
        }

        const result = await query(
            'INSERT INTO executive_notification_emails (executive_id, email, active) VALUES (?, ?, true)',
            [data.executiveId, data.email.trim().toLowerCase()]
        ) as any;

        return result.insertId;
    },

    async update(id: number, data: UpdateExecutiveNotificationEmailDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.email !== undefined) {
            // Verificar se email já existe para outro registro do mesmo executivo
            const current = await this.findById(id);
            if (current) {
                const existing = await query(
                    'SELECT id FROM executive_notification_emails WHERE executive_id = ? AND email = ? AND id != ?',
                    [current.executiveId, data.email.trim().toLowerCase(), id]
                ) as any[];

                if (Array.isArray(existing) && existing.length > 0) {
                    throw new Error('Email já cadastrado para este executivo');
                }
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
            `UPDATE executive_notification_emails SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    },

    async delete(id: number): Promise<void> {
        await query(
            'DELETE FROM executive_notification_emails WHERE id = ?',
            [id]
        );
    },
};
