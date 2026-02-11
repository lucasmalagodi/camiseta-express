"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const db_1 = require("../config/db");
exports.userService = {
    async findAll(filters) {
        let sql = 'SELECT id, name, email, role, active, created_at as createdAt, updated_at as updatedAt FROM users WHERE 1=1';
        const values = [];
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
        const results = await (0, db_1.query)(sql, values);
        return Array.isArray(results) ? results : [];
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, name, email, role, active, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByEmail(email) {
        const results = await (0, db_1.query)('SELECT id, name, email, role, active, created_at as createdAt, updated_at as updatedAt FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async create(data) {
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
        const result = await (0, db_1.query)('INSERT INTO users (name, email, password, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, true, NOW(), NOW())', [data.name.trim(), data.email.toLowerCase().trim(), data.password, data.role]);
        return result.insertId;
    },
    async update(id, data) {
        const updates = [];
        const values = [];
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
        if (updates.length === 0) {
            return;
        }
        updates.push('updated_at = NOW()');
        values.push(id);
        await (0, db_1.query)(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    },
    async updateStatus(id, active) {
        await (0, db_1.query)('UPDATE users SET active = ?, updated_at = NOW() WHERE id = ?', [active, id]);
    },
};
