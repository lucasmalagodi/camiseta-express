"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderNotificationEmailService = void 0;
const db_1 = require("../config/db");
exports.orderNotificationEmailService = {
    async findAll() {
        const results = await (0, db_1.query)('SELECT id, email, active, created_at as createdAt, updated_at as updatedAt FROM order_notification_emails ORDER BY created_at DESC');
        return Array.isArray(results) ? results : [];
    },
    async findActive() {
        const results = await (0, db_1.query)('SELECT id, email, active, created_at as createdAt, updated_at as updatedAt FROM order_notification_emails WHERE active = true ORDER BY email ASC');
        return Array.isArray(results) ? results : [];
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, email, active, created_at as createdAt, updated_at as updatedAt FROM order_notification_emails WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByEmail(email) {
        const results = await (0, db_1.query)('SELECT id, email, active, created_at as createdAt, updated_at as updatedAt FROM order_notification_emails WHERE email = ?', [email]);
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
        const result = await (0, db_1.query)('INSERT INTO order_notification_emails (email, active) VALUES (?, true)', [data.email.trim().toLowerCase()]);
        return result.insertId;
    },
    async update(id, data) {
        const updates = [];
        const values = [];
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
        await (0, db_1.query)(`UPDATE order_notification_emails SET ${updates.join(', ')} WHERE id = ?`, values);
    },
    async delete(id) {
        await (0, db_1.query)('DELETE FROM order_notification_emails WHERE id = ?', [id]);
    },
};
