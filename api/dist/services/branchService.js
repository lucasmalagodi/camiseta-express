"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchService = void 0;
const db_1 = require("../config/db");
exports.branchService = {
    async findAll() {
        const results = await (0, db_1.query)('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM branches ORDER BY name ASC');
        return Array.isArray(results) ? results : [];
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM branches WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByName(name) {
        const results = await (0, db_1.query)('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM branches WHERE name = ?', [name]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async create(data) {
        // Verificar se já existe branch com este nome
        const existing = await this.findByName(data.name);
        if (existing) {
            throw new Error('Filial já cadastrada');
        }
        const result = await (0, db_1.query)('INSERT INTO branches (name) VALUES (?)', [data.name.trim()]);
        return result.insertId;
    },
    async update(id, data) {
        const updates = [];
        const values = [];
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
        await (0, db_1.query)(`UPDATE branches SET ${updates.join(', ')} WHERE id = ?`, values);
    },
    async delete(id) {
        await (0, db_1.query)('DELETE FROM branches WHERE id = ?', [id]);
    },
    // Buscar todos os branch únicos da tabela agency_points_import_items
    async getUniqueBranchNames() {
        const results = await (0, db_1.query)(`SELECT DISTINCT branch 
             FROM agency_points_import_items 
             WHERE branch IS NOT NULL 
             AND branch != '' 
             ORDER BY branch ASC`);
        if (Array.isArray(results) && results.length > 0) {
            return results.map((row) => row.branch).filter((name) => name && name.trim() !== '');
        }
        return [];
    },
};
