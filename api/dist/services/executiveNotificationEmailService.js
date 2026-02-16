"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executiveNotificationEmailService = void 0;
const db_1 = require("../config/db");
exports.executiveNotificationEmailService = {
    async findByExecutiveId(executiveId) {
        const results = await (0, db_1.query)('SELECT id, executive_id as executiveId, email, active, created_at as createdAt, updated_at as updatedAt FROM executive_notification_emails WHERE executive_id = ? ORDER BY created_at ASC', [executiveId]);
        return Array.isArray(results) ? results : [];
    },
    async findActiveByExecutiveId(executiveId) {
        const results = await (0, db_1.query)('SELECT id, executive_id as executiveId, email, active, created_at as createdAt, updated_at as updatedAt FROM executive_notification_emails WHERE executive_id = ? AND active = true ORDER BY created_at ASC', [executiveId]);
        return Array.isArray(results) ? results : [];
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, executive_id as executiveId, email, active, created_at as createdAt, updated_at as updatedAt FROM executive_notification_emails WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async create(data) {
        // Verificar se email já existe para este executivo
        const existing = await (0, db_1.query)('SELECT id FROM executive_notification_emails WHERE executive_id = ? AND email = ?', [data.executiveId, data.email.trim().toLowerCase()]);
        if (Array.isArray(existing) && existing.length > 0) {
            throw new Error('Email já cadastrado para este executivo');
        }
        const result = await (0, db_1.query)('INSERT INTO executive_notification_emails (executive_id, email, active) VALUES (?, ?, true)', [data.executiveId, data.email.trim().toLowerCase()]);
        return result.insertId;
    },
    async update(id, data) {
        const updates = [];
        const values = [];
        if (data.email !== undefined) {
            // Verificar se email já existe para outro registro do mesmo executivo
            const current = await this.findById(id);
            if (current) {
                const existing = await (0, db_1.query)('SELECT id FROM executive_notification_emails WHERE executive_id = ? AND email = ? AND id != ?', [current.executiveId, data.email.trim().toLowerCase(), id]);
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
        await (0, db_1.query)(`UPDATE executive_notification_emails SET ${updates.join(', ')} WHERE id = ?`, values);
    },
    async delete(id) {
        await (0, db_1.query)('DELETE FROM executive_notification_emails WHERE id = ?', [id]);
    },
};
