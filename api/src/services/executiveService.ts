import { query } from '../config/db';

export interface Executive {
    id: number;
    code: string;
    email: string;
    name?: string;
    branchId?: number | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateExecutiveDto {
    code: string;
    email: string;
    name?: string;
    branchId?: number | null;
}

export interface UpdateExecutiveDto {
    code?: string;
    email?: string;
    name?: string;
    branchId?: number | null;
    active?: boolean;
}

export const executiveService = {
    async findAll(): Promise<Executive[]> {
        const results = await query(
            'SELECT id, code, email, name, branch_id as branchId, active, created_at as createdAt, updated_at as updatedAt FROM executives ORDER BY code ASC'
        ) as Executive[];

        return Array.isArray(results) ? results : [];
    },

    async findActive(): Promise<Executive[]> {
        const results = await query(
            'SELECT id, code, email, name, branch_id as branchId, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE active = true ORDER BY code ASC'
        ) as Executive[];

        return Array.isArray(results) ? results : [];
    },

    async findById(id: number): Promise<Executive | null> {
        const results = await query(
            'SELECT id, code, email, name, branch_id as branchId, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE id = ?',
            [id]
        ) as Executive[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findByCode(code: string): Promise<Executive | null> {
        const results = await query(
            'SELECT id, code, email, name, branch_id as branchId, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE code = ? AND active = true',
            [code]
        ) as Executive[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findByEmail(email: string): Promise<Executive | null> {
        const results = await query(
            'SELECT id, code, email, name, branch_id as branchId, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE email = ?',
            [email]
        ) as Executive[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async create(data: CreateExecutiveDto): Promise<number> {
        // Verificar se código já existe
        const existingByCode = await this.findByCode(data.code);
        if (existingByCode) {
            throw new Error('Código já cadastrado');
        }

        // Verificar se email já existe
        const existingByEmail = await this.findByEmail(data.email);
        if (existingByEmail) {
            throw new Error('Email já cadastrado');
        }

        const result = await query(
            'INSERT INTO executives (code, email, name, branch_id, active) VALUES (?, ?, ?, ?, true)',
            [data.code.trim(), data.email.trim().toLowerCase(), data.name?.trim() || null, data.branchId || null]
        ) as any;

        return result.insertId;
    },

    async update(id: number, data: UpdateExecutiveDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.code !== undefined) {
            // Verificar se código já existe em outro registro
            const existing = await this.findByCode(data.code);
            if (existing && existing.id !== id) {
                throw new Error('Código já cadastrado em outro registro');
            }
            updates.push('code = ?');
            values.push(data.code.trim());
        }

        if (data.email !== undefined) {
            // Verificar se email já existe em outro registro
            const existing = await this.findByEmail(data.email);
            if (existing && existing.id !== id) {
                throw new Error('Email já cadastrado em outro registro');
            }
            updates.push('email = ?');
            values.push(data.email.trim().toLowerCase());
        }

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name.trim() || null);
        }

        if (data.branchId !== undefined) {
            updates.push('branch_id = ?');
            values.push(data.branchId || null);
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
            `UPDATE executives SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    },

    async delete(id: number): Promise<void> {
        await query(
            'DELETE FROM executives WHERE id = ?',
            [id]
        );
    },

    // Buscar executivo pelo nome (usado para vincular com agency_points_import_items)
    async findByExecutiveName(executiveName: string): Promise<Executive | null> {
        // O código do executivo deve corresponder ao executive_name
        const results = await query(
            'SELECT id, code, email, name, branch_id as branchId, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE code = ? AND active = true',
            [executiveName.trim()]
        ) as Executive[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    // Buscar executivos por branch_id
    async findByBranchId(branchId: number): Promise<Executive[]> {
        const results = await query(
            'SELECT id, code, email, name, branch_id as branchId, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE branch_id = ? AND active = true ORDER BY code ASC',
            [branchId]
        ) as Executive[];

        return Array.isArray(results) ? results : [];
    },

    // Buscar todos os executive_name únicos da tabela agency_points_import_items
    async getUniqueExecutiveNames(): Promise<string[]> {
        const results = await query(
            `SELECT DISTINCT executive_name 
             FROM agency_points_import_items 
             WHERE executive_name IS NOT NULL 
             AND executive_name != '' 
             ORDER BY executive_name ASC`
        ) as any[];

        if (Array.isArray(results) && results.length > 0) {
            return results.map((row) => row.executive_name).filter((name) => name && name.trim() !== '');
        }
        return [];
    },
};
