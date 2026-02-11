import { query } from '../config/db';
import { ProductImage, CreateProductImageDto, UpdateProductImageDto } from '../types';

export const productImageService = {
    async create(productId: number, data: CreateProductImageDto): Promise<number> {
        // Buscar a maior ordem atual para definir a ordem padrão
        const maxOrderResult = await query(
            'SELECT COALESCE(MAX(display_order), 0) as maxOrder FROM product_images WHERE product_id = ?',
            [productId]
        ) as any[];

        const maxOrder = Array.isArray(maxOrderResult) && maxOrderResult.length > 0
            ? Number(maxOrderResult[0].maxOrder) || 0
            : 0;

        const displayOrder = data.displayOrder !== undefined ? data.displayOrder : maxOrder + 1;
        const favorite = data.favorite === true ? 1 : 0;

        // Se está marcando como favorita, desmarcar outras
        if (favorite === 1) {
            await query(
                'UPDATE product_images SET favorite = false, updated_at = NOW() WHERE product_id = ?',
                [productId]
            );
        }

        const result = await query(
            'INSERT INTO product_images (product_id, path, name, active, display_order, favorite, created_at, updated_at) VALUES (?, ?, ?, true, ?, ?, NOW(), NOW())',
            [productId, data.path, data.name, displayOrder, favorite]
        ) as any;
        return result.insertId;
    },

    async update(productId: number, imageId: number, data: UpdateProductImageDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.path !== undefined) {
            updates.push('path = ?');
            values.push(data.path);
        }

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }

        if (data.active !== undefined) {
            updates.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (data.displayOrder !== undefined) {
            updates.push('display_order = ?');
            values.push(data.displayOrder);
        }

        if (data.favorite !== undefined) {
            // Se está marcando como favorita, desmarcar outras do mesmo produto
            if (data.favorite === true) {
                await query(
                    'UPDATE product_images SET favorite = false, updated_at = NOW() WHERE product_id = ? AND id != ?',
                    [productId, imageId]
                );
            }
            updates.push('favorite = ?');
            values.push(data.favorite ? 1 : 0);
        }

        if (updates.length === 0) {
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(productId, imageId);

        await query(
            `UPDATE product_images SET ${updates.join(', ')} WHERE product_id = ? AND id = ?`,
            values
        );
    },

    async softDelete(productId: number, imageId: number): Promise<void> {
        await query(
            'UPDATE product_images SET active = false, updated_at = NOW() WHERE product_id = ? AND id = ?',
            [productId, imageId]
        );
    },

    async hardDelete(productId: number, imageId: number): Promise<void> {
        await query(
            'DELETE FROM product_images WHERE product_id = ? AND id = ?',
            [productId, imageId]
        );
    },

    async findById(productId: number, imageId: number): Promise<ProductImage | null> {
        const results = await query(
            'SELECT id, product_id as productId, path, name, active, display_order as displayOrder, favorite, created_at as createdAt, updated_at as updatedAt FROM product_images WHERE product_id = ? AND id = ?',
            [productId, imageId]
        ) as any[];

        if (Array.isArray(results) && results.length > 0) {
            const img = results[0];
            // Converter favorite de 0/1 para boolean e garantir que displayOrder seja número
            return {
                ...img,
                favorite: img.favorite === 1 || img.favorite === true,
                displayOrder: Number(img.displayOrder) || 0,
                active: img.active === 1 || img.active === true
            };
        }
        return null;
    },

    async findAllByProductId(productId: number): Promise<ProductImage[]> {
        const results = await query(
            'SELECT id, product_id as productId, path, name, active, display_order as displayOrder, favorite, created_at as createdAt, updated_at as updatedAt FROM product_images WHERE product_id = ? ORDER BY favorite DESC, display_order ASC, created_at ASC',
            [productId]
        ) as any[];
        
        // Converter favorite de 0/1 para boolean e garantir que displayOrder seja número
        const images = Array.isArray(results) ? results.map((img: any) => ({
            ...img,
            favorite: img.favorite === 1 || img.favorite === true,
            displayOrder: Number(img.displayOrder) || 0,
            active: img.active === 1 || img.active === true
        })) : [];
        
        return images;
    },

    async updateOrder(productId: number, updates: Array<{ id: number; displayOrder: number }>): Promise<void> {
        // Importar pool para usar transação
        const { pool } = require('../config/db');
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Para cada atualização
            for (const update of updates) {
                await connection.execute(
                    'UPDATE product_images SET display_order = ?, updated_at = NOW() WHERE product_id = ? AND id = ?',
                    [update.displayOrder, productId, update.id]
                );
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};
