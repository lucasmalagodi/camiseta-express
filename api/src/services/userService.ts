import { query } from '../config/db';

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateAdminUserDto {
    name: string;
    email: string;
    password: string;
    role: string;
}

export interface UpdateAdminUserDto {
    name?: string;
    role?: string;
    password?: string;
}

export interface UserFilters {
    name?: string;
    email?: string;
    role?: string;
    active?: boolean;
}

export const userService = {
    async findAll(filters?: UserFilters): Promise<AdminUser[]> {
        let sql = 'SELECT id, name, email, role, active, created_at as createdAt, updated_at as updatedAt FROM users WHERE 1=1';
        const values: any[] = [];

        if (filters?.name) {
            sql += ' AND name LIKE ?';
            values.push(`%${filters.name}%`);
        }

        if (filters?.email) {
            sql += ' AND email LIKE ?';
            values.push(`%${filters.email}%`);
        }

        if (filters?.role) {
            sql += ' AND role = ?';
            values.push(filters.role);
        }

        if (filters?.active !== undefined) {
            sql += ' AND active = ?';
            values.push(filters.active);
        }

        sql += ' ORDER BY created_at DESC';

        const results = await query(sql, values) as AdminUser[];
        return Array.isArray(results) ? results : [];
    },

    async findById(id: number): Promise<AdminUser | null> {
        const results = await query(
            'SELECT id, name, email, role, active, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
            [id]
        ) as AdminUser[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findByEmail(email: string): Promise<AdminUser | null> {
        const results = await query(
            'SELECT id, name, email, role, active, created_at as createdAt, updated_at as updatedAt FROM users WHERE email = ?',
            [email.toLowerCase().trim()]
        ) as AdminUser[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async create(data: CreateAdminUserDto): Promise<number> {
        // Verificar se email já existe
        const existing = await this.findByEmail(data.email);
        if (existing) {
            throw new Error('Email já cadastrado');
        }

        // Validar role
        const validRoles = ['admin', 'user', 'agency'];
        if (!validRoles.includes(data.role)) {
            throw new Error('Role inválido');
        }

        // Hash da senha será feito no controller
        // Aqui apenas inserimos o usuário
        const result = await query(
            'INSERT INTO users (name, email, password, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, true, NOW(), NOW())',
            [data.name.trim(), data.email.toLowerCase().trim(), data.password, data.role]
        ) as any;

        return result.insertId;
    },

    async update(id: number, data: UpdateAdminUserDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name.trim());
        }

        if (data.role !== undefined) {
            // Validar role
            const validRoles = ['admin', 'user', 'agency'];
            if (!validRoles.includes(data.role)) {
                throw new Error('Role inválido');
            }
            updates.push('role = ?');
            values.push(data.role);
        }

        if (data.password !== undefined) {
            // A senha será hasheada no controller antes de chegar aqui
            updates.push('password = ?');
            values.push(data.password);
        }

        if (updates.length === 0) {
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(id);

        await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    },

    async updateStatus(id: number, active: boolean): Promise<void> {
        await query(
            'UPDATE users SET active = ?, updated_at = NOW() WHERE id = ?',
            [active, id]
        );
    },
};
