import { query } from '../config/db';
import { ProductPrice, CreateProductPriceDto, UpdateProductPriceDto } from '../types';

export const productPriceService = {
    async create(productId: number, data: CreateProductPriceDto): Promise<number> {
        const quantidadeCompra = data.quantidadeCompra !== undefined ? data.quantidadeCompra : 0;
        const result = await query(
            'INSERT INTO product_prices (product_id, value, batch, quantidade_compra, active, created_at, updated_at) VALUES (?, ?, ?, ?, true, NOW(), NOW())',
            [productId, data.value, data.batch, quantidadeCompra]
        ) as any;
        return result.insertId;
    },

    async update(productId: number, priceId: number, data: UpdateProductPriceDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

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

        await query(
            `UPDATE product_prices SET ${updates.join(', ')} WHERE product_id = ? AND id = ?`,
            values
        );
    },

    async softDelete(productId: number, priceId: number): Promise<void> {
        await query(
            'UPDATE product_prices SET active = false, updated_at = NOW() WHERE product_id = ? AND id = ?',
            [productId, priceId]
        );
    },

    async findById(productId: number, priceId: number): Promise<ProductPrice | null> {
        const results = await query(
            'SELECT id, product_id as productId, value, batch, quantidade_compra as quantidadeCompra, active, created_at as createdAt, updated_at as updatedAt FROM product_prices WHERE product_id = ? AND id = ?',
            [productId, priceId]
        ) as ProductPrice[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findAllByProductId(productId: number): Promise<ProductPrice[]> {
        const results = await query(
            'SELECT id, product_id as productId, value, batch, quantidade_compra as quantidadeCompra, active, created_at as createdAt, updated_at as updatedAt FROM product_prices WHERE product_id = ? ORDER BY created_at DESC',
            [productId]
        ) as ProductPrice[];
        return Array.isArray(results) ? results : [];
    }
};
