"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productPriceService = void 0;
const db_1 = require("../config/db");
exports.productPriceService = {
    async create(productId, data) {
        const quantidadeCompra = data.quantidadeCompra !== undefined ? data.quantidadeCompra : 0;
        const result = await (0, db_1.query)('INSERT INTO product_prices (product_id, value, batch, quantidade_compra, active, created_at, updated_at) VALUES (?, ?, ?, ?, true, NOW(), NOW())', [productId, data.value, data.batch, quantidadeCompra]);
        return result.insertId;
    },
    async update(productId, priceId, data) {
        const updates = [];
        const values = [];
        if (data.value !== undefined) {
            updates.push('value = ?');
            values.push(data.value);
        }
        if (data.batch !== undefined) {
            updates.push('batch = ?');
            values.push(data.batch);
        }
        if (data.quantidadeCompra !== undefined) {
            updates.push('quantidade_compra = ?');
            values.push(data.quantidadeCompra);
        }
        if (data.active !== undefined) {
            updates.push('active = ?');
            values.push(data.active);
        }
        if (updates.length === 0) {
            return;
        }
        updates.push('updated_at = NOW()');
        values.push(productId, priceId);
        await (0, db_1.query)(`UPDATE product_prices SET ${updates.join(', ')} WHERE product_id = ? AND id = ?`, values);
    },
    async softDelete(productId, priceId) {
        await (0, db_1.query)('UPDATE product_prices SET active = false, updated_at = NOW() WHERE product_id = ? AND id = ?', [productId, priceId]);
    },
    async findById(productId, priceId) {
        const results = await (0, db_1.query)('SELECT id, product_id as productId, value, batch, quantidade_compra as quantidadeCompra, active, created_at as createdAt, updated_at as updatedAt FROM product_prices WHERE product_id = ? AND id = ?', [productId, priceId]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findAllByProductId(productId) {
        const results = await (0, db_1.query)('SELECT id, product_id as productId, value, batch, quantidade_compra as quantidadeCompra, active, created_at as createdAt, updated_at as updatedAt FROM product_prices WHERE product_id = ? ORDER BY created_at DESC', [productId]);
        return Array.isArray(results) ? results : [];
    }
};
