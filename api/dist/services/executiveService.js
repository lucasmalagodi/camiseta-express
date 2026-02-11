"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executiveService = void 0;
const db_1 = require("../config/db");
exports.executiveService = {
    async findAll() {
        const results = await (0, db_1.query)('SELECT id, code, email, name, active, created_at as createdAt, updated_at as updatedAt FROM executives ORDER BY code ASC');
        return Array.isArray(results) ? results : [];
    },
    async findActive() {
        const results = await (0, db_1.query)('SELECT id, code, email, name, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE active = true ORDER BY code ASC');
        return Array.isArray(results) ? results : [];
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, code, email, name, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByCode(code) {
        const results = await (0, db_1.query)('SELECT id, code, email, name, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE code = ? AND active = true', [code]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByEmail(email) {
        const results = await (0, db_1.query)('SELECT id, code, email, name, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE email = ?', [email]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async create(data) {
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
        const result = await (0, db_1.query)('INSERT INTO executives (code, email, name, active) VALUES (?, ?, ?, true)', [data.code.trim(), data.email.trim().toLowerCase(), data.name?.trim() || null]);
        return result.insertId;
    },
    async update(id, data) {
        const updates = [];
        const values = [];
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
        if (data.active !== undefined) {
            updates.push('active = ?');
            values.push(data.active);
        }
        if (updates.length === 0) {
            return;
        }
        updates.push('updated_at = NOW()');
        values.push(id);
        await (0, db_1.query)(`UPDATE executives SET ${updates.join(', ')} WHERE id = ?`, values);
    },
    async delete(id) {
        await (0, db_1.query)('DELETE FROM executives WHERE id = ?', [id]);
    },
    // Buscar executivo pelo nome (usado para vincular com agency_points_import_items)
    async findByExecutiveName(executiveName) {
        // O código do executivo deve corresponder ao executive_name
        const results = await (0, db_1.query)('SELECT id, code, email, name, active, created_at as createdAt, updated_at as updatedAt FROM executives WHERE code = ? AND active = true', [executiveName.trim()]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    // Buscar todos os executive_name únicos da tabela agency_points_import_items
    async getUniqueExecutiveNames() {
        const results = await (0, db_1.query)(`SELECT DISTINCT executive_name 
             FROM agency_points_import_items 
             WHERE executive_name IS NOT NULL 
             AND executive_name != '' 
             ORDER BY executive_name ASC`);
        if (Array.isArray(results) && results.length > 0) {
            return results.map((row) => row.executive_name).filter((name) => name && name.trim() !== '');
        }
        return [];
    },
};
