import { query } from '../config/db';

export interface Branch {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateBranchDto {
    name: string;
}

export interface UpdateBranchDto {
    name?: string;
}

export const branchService = {
    async findAll(): Promise<Branch[]> {
        const results = await query(
            'SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM branches ORDER BY name ASC'
        ) as Branch[];

        return Array.isArray(results) ? results : [];
    },

    async findById(id: number): Promise<Branch | null> {
        const results = await query(
            'SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM branches WHERE id = ?',
            [id]
        ) as Branch[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findByName(name: string): Promise<Branch | null> {
        const results = await query(
            'SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM branches WHERE name = ?',
            [name]
        ) as Branch[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async create(data: CreateBranchDto): Promise<number> {
        // Verificar se já existe branch com este nome
        const existing = await this.findByName(data.name);
        if (existing) {
            throw new Error('Filial já cadastrada');
        }

        const result = await query(
            'INSERT INTO branches (name) VALUES (?)',
            [data.name.trim()]
        ) as any;

        return result.insertId;
    },

    async update(id: number, data: UpdateBranchDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) {
            // Verificar se nome já existe em outro registro
            const existing = await this.findByName(data.name);
            if (existing && existing.id !== id) {
                throw new Error('Filial já cadastrada com este nome');
            }
            updates.push('name = ?');
            values.push(data.name.trim());
        }

        if (updates.length === 0) {
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(id);

        await query(
            `UPDATE branches SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    },

    async delete(id: number): Promise<void> {
        await query(
            'DELETE FROM branches WHERE id = ?',
            [id]
        );
    },

    // Buscar todos os branch únicos da tabela agency_points_import_items
    async getUniqueBranchNames(): Promise<string[]> {
        const results = await query(
            `SELECT DISTINCT branch 
             FROM agency_points_import_items 
             WHERE branch IS NOT NULL 
             AND branch != '' 
             ORDER BY branch ASC`
        ) as any[];

        if (Array.isArray(results) && results.length > 0) {
            return results.map((row) => row.branch).filter((name) => name && name.trim() !== '');
        }
        return [];
    },
};
