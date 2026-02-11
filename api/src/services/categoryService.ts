import { query } from '../config/db';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../types';

export const categoryService = {
    async create(data: CreateCategoryDto): Promise<number> {
        const result = await query(
            'INSERT INTO categories (name, active, created_at, updated_at) VALUES (?, true, NOW(), NOW())',
            [data.name]
        ) as any;
        return result.insertId;
    },

    async update(id: number, data: UpdateCategoryDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }

        if (updates.length === 0) {
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(id);

        await query(
            `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    },

    async softDelete(id: number): Promise<void> {
        await query(
            'UPDATE categories SET active = false, updated_at = NOW() WHERE id = ?',
            [id]
        );
    },

    async findById(id: number): Promise<Category | null> {
        const results = await query(
            'SELECT id, name, active, created_at as createdAt, updated_at as updatedAt FROM categories WHERE id = ?',
            [id]
        ) as Category[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findAll(): Promise<Category[]> {
        const results = await query(
            'SELECT id, name, active, created_at as createdAt, updated_at as updatedAt FROM categories ORDER BY created_at DESC'
        ) as Category[];
        return Array.isArray(results) ? results : [];
    }
};
