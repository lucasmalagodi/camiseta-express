"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = void 0;
const db_1 = require("../config/db");
exports.categoryService = {
    async create(data) {
        const result = await (0, db_1.query)('INSERT INTO categories (name, active, created_at, updated_at) VALUES (?, true, NOW(), NOW())', [data.name]);
        return result.insertId;
    },
    async update(id, data) {
        const updates = [];
        const values = [];
        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (updates.length === 0) {
            return;
        }
        updates.push('updated_at = NOW()');
        values.push(id);
        await (0, db_1.query)(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    },
    async softDelete(id) {
        await (0, db_1.query)('UPDATE categories SET active = false, updated_at = NOW() WHERE id = ?', [id]);
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, name, active, created_at as createdAt, updated_at as updatedAt FROM categories WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findAll() {
        const results = await (0, db_1.query)('SELECT id, name, active, created_at as createdAt, updated_at as updatedAt FROM categories ORDER BY created_at DESC');
        return Array.isArray(results) ? results : [];
    }
};
