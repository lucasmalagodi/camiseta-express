"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productVariantService = void 0;
const db_1 = require("../config/db");
exports.productVariantService = {
    async create(productId, data) {
        // Verificar se já existe variação com mesmo produto, modelo e tamanho
        const existing = await this.findByProductModelSize(productId, data.model, data.size);
        if (existing) {
            throw new Error(`Variação com modelo ${data.model} e tamanho ${data.size} já existe para este produto`);
        }
        const result = await (0, db_1.query)('INSERT INTO product_variants (product_id, model, size, stock, active, created_at, updated_at) VALUES (?, ?, ?, ?, true, NOW(), NOW())', [productId, data.model, data.size, data.stock]);
        return result.insertId;
    },
    async update(id, data) {
        const updates = [];
        const values = [];
        if (data.model !== undefined) {
            updates.push('model = ?');
            values.push(data.model);
        }
        if (data.size !== undefined) {
            updates.push('size = ?');
            values.push(data.size);
        }
        if (data.stock !== undefined) {
            updates.push('stock = ?');
            values.push(data.stock);
        }
        if (data.active !== undefined) {
            updates.push('active = ?');
            values.push(data.active ? 1 : 0);
        }
        if (updates.length === 0) {
            return;
        }
        updates.push('updated_at = NOW()');
        values.push(id);
        // Se está atualizando model ou size, verificar duplicatas
        if (data.model !== undefined || data.size !== undefined) {
            const variant = await this.findById(id);
            if (variant) {
                const newModel = data.model !== undefined ? data.model : variant.model;
                const newSize = data.size !== undefined ? data.size : variant.size;
                const existing = await this.findByProductModelSize(variant.productId, newModel, newSize);
                if (existing && existing.id !== id) {
                    throw new Error(`Variação com modelo ${newModel} e tamanho ${newSize} já existe para este produto`);
                }
            }
        }
        const sql = `UPDATE product_variants SET ${updates.join(', ')} WHERE id = ?`;
        await (0, db_1.query)(sql, values);
    },
    async delete(id) {
        await (0, db_1.query)('UPDATE product_variants SET active = 0, updated_at = NOW() WHERE id = ?', [id]);
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, product_id as productId, model, size, stock, active, created_at as createdAt, updated_at as updatedAt FROM product_variants WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByProductModelSize(productId, model, size) {
        const results = await (0, db_1.query)('SELECT id, product_id as productId, model, size, stock, active, created_at as createdAt, updated_at as updatedAt FROM product_variants WHERE product_id = ? AND model = ? AND size = ?', [productId, model, size]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByProductId(productId, activeOnly = false) {
        let sql = 'SELECT id, product_id as productId, model, size, stock, active, created_at as createdAt, updated_at as updatedAt FROM product_variants WHERE product_id = ?';
        const params = [productId];
        if (activeOnly) {
            sql += ' AND active = true';
        }
        sql += ' ORDER BY model ASC, size ASC';
        const results = await (0, db_1.query)(sql, params);
        return Array.isArray(results) ? results : [];
    },
    async bulkCreate(productId, variants) {
        // Validar duplicatas antes de inserir
        for (const variant of variants) {
            const existing = await this.findByProductModelSize(productId, variant.model, variant.size);
            if (existing) {
                throw new Error(`Variação com modelo ${variant.model} e tamanho ${variant.size} já existe`);
            }
        }
        // Inserir todas as variações
        for (const variant of variants) {
            await this.create(productId, variant);
        }
    },
    async bulkUpdate(productId, variants) {
        // Buscar variações existentes
        const existingVariants = await this.findByProductId(productId, false);
        // Criar map de variações existentes por (model, size)
        const existingMap = new Map();
        existingVariants.forEach(v => {
            const key = `${v.model}:${v.size}`;
            existingMap.set(key, v);
        });
        // Criar map de novas variações por (model, size)
        const newMap = new Map();
        variants.forEach(v => {
            const key = `${v.model}:${v.size}`;
            newMap.set(key, v);
        });
        // Atualizar variações existentes ou criar novas
        for (const variant of variants) {
            const key = `${variant.model}:${variant.size}`;
            const existing = existingMap.get(key);
            if (existing) {
                // Atualizar variação existente
                await this.update(existing.id, {
                    stock: variant.stock,
                    active: true
                });
            }
            else {
                // Criar nova variação
                await this.create(productId, variant);
            }
        }
        // Desativar variações que não estão mais na lista
        for (const existing of existingVariants) {
            const key = `${existing.model}:${existing.size}`;
            if (!newMap.has(key)) {
                await this.delete(existing.id);
            }
        }
    },
    async decrementStock(id, quantity) {
        await (0, db_1.query)('UPDATE product_variants SET stock = stock - ?, updated_at = NOW() WHERE id = ? AND stock >= ?', [quantity, id, quantity]);
    }
};
