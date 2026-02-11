import { query } from '../config/db';
import { Product, CreateProductDto, UpdateProductDto, ProductFilters } from '../types';

export const productService = {
    async create(data: CreateProductDto): Promise<number> {
        const result = await query(
            'INSERT INTO products (category_id, name, description, quantity, active, created_at, updated_at) VALUES (?, ?, ?, ?, true, NOW(), NOW())',
            [data.categoryId, data.name, data.description, data.quantity ?? 0]
        ) as any;
        return result.insertId;
    },

    async update(id: number, data: UpdateProductDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.categoryId !== undefined) {
            updates.push('category_id = ?');
            values.push(data.categoryId);
        }

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }

        if (data.description !== undefined) {
            updates.push('description = ?');
            values.push(data.description);
        }

        if (data.quantity !== undefined) {
            updates.push('quantity = ?');
            values.push(data.quantity);
        }

        // Verificar explicitamente se active foi passado (incluindo 0)
        if ('active' in data && data.active !== undefined) {
            // O valor já deve vir como 1 ou 0 do controller
            // Mas garantimos que seja número
            const activeValue = typeof data.active === 'number' ? data.active : (data.active ? 1 : 0);
            
            updates.push('active = ?');
            values.push(activeValue);
            console.log('Updating active field in service:', { 
                received: data.active, 
                receivedType: typeof data.active,
                finalValue: activeValue,
                finalType: typeof activeValue
            });
        }

        if (updates.length === 0) {
            console.log('No updates to perform');
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(id);

        const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
        console.log('Executing SQL:', sql);
        console.log('SQL Values:', JSON.stringify(values));
        console.log('Values types:', values.map(v => ({ value: v, type: typeof v, isInteger: Number.isInteger(v) })));
        
        // Executar a query
        const result = await query(sql, values) as any;
        console.log('Query result:', JSON.stringify(result));
        console.log('Rows affected:', result?.affectedRows);
        console.log('Changed rows:', result?.changedRows);
        
        // Se nenhuma linha foi afetada, pode ser que o valor já seja o mesmo
        if (result?.affectedRows === 0) {
            console.warn('No rows were affected - value may already be the same');
        }
        
        // Aguardar um pouco para garantir que o banco processou
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar se realmente atualizou - fazer query direta para garantir
        const verifyResult = await query(
            'SELECT active FROM products WHERE id = ?',
            [id]
        ) as any[];
        console.log('Direct query result:', verifyResult);
        const activeFromDb = verifyResult?.[0]?.active;
        console.log('Active value from direct query:', activeFromDb, 'type:', typeof activeFromDb);
        
        // Também verificar via findById
        const updated = await this.findById(id);
        console.log('Product after update (via findById):', updated);
        console.log('Active value in DB (via findById):', updated?.active, 'type:', typeof updated?.active);
        
        if (updated && 'active' in data && updated.active !== (data.active ? true : false)) {
            console.error('WARNING: Active value was not updated correctly!');
            console.error('Expected:', data.active ? true : false);
            console.error('Got:', updated.active);
        }
        
        console.log('Product update executed successfully');
    },

    async softDelete(id: number): Promise<void> {
        await query(
            'UPDATE products SET active = 0, updated_at = NOW() WHERE id = ?',
            [id]
        );
    },

    async findById(id: number): Promise<Product | null> {
        const results = await query(
            'SELECT id, category_id as categoryId, name, description, quantity, active, created_at as createdAt, updated_at as updatedAt FROM products WHERE id = ?',
            [id]
        ) as Product[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findAll(filters?: ProductFilters): Promise<{ data: Product[]; total: number }> {
        let whereClause = 'WHERE 1=1';
        const values: any[] = [];

        if (filters) {
            if (filters.categoryId !== undefined) {
                whereClause += ' AND category_id = ?';
                values.push(filters.categoryId);
            }

            if (filters.active !== undefined) {
                whereClause += ' AND active = ?';
                values.push(filters.active);
            }

            if (filters.name) {
                whereClause += ' AND name LIKE ?';
                values.push(`%${filters.name}%`);
            }
        }

        const sql = `SELECT id, category_id as categoryId, name, description, quantity, active, created_at as createdAt, updated_at as updatedAt FROM products ${whereClause} ORDER BY created_at DESC`;
        const results = await query(sql, values) as Product[];
        const data = Array.isArray(results) ? results : [];

        const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
        const countResults = await query(countSql, values) as any[];
        const total = Array.isArray(countResults) && countResults.length > 0 ? (countResults[0].total as number) : 0;

        return { data, total };
    },

    // Buscar produtos com imagens e preços incluídos (otimizado para frontend)
    async findAllWithDetails(filters?: ProductFilters, agencyId?: number): Promise<{ data: any[]; total: number }> {
        let whereClause = 'WHERE 1=1';
        const values: any[] = [];

        if (filters) {
            if (filters.categoryId !== undefined) {
                whereClause += ' AND category_id = ?';
                values.push(filters.categoryId);
            }

            if (filters.active !== undefined) {
                whereClause += ' AND active = ?';
                values.push(filters.active);
            }

            if (filters.name) {
                whereClause += ' AND name LIKE ?';
                values.push(`%${filters.name}%`);
            }
        }

        // Buscar produtos
        const sql = `SELECT id, category_id as categoryId, name, description, quantity, active, created_at as createdAt, updated_at as updatedAt FROM products ${whereClause} ORDER BY created_at DESC`;
        const products = await query(sql, values) as Product[];
        const data = Array.isArray(products) ? products : [];

        // Buscar imagens e preços para todos os produtos de uma vez
        if (data.length > 0) {
            const productIds = data.map(p => p.id);
            const placeholders = productIds.map(() => '?').join(',');

            // Buscar todas as imagens (priorizar favorita, depois por ordem)
            const imagesSql = `SELECT id, product_id as productId, path, name, active, display_order as displayOrder, favorite, created_at as createdAt, updated_at as updatedAt FROM product_images WHERE product_id IN (${placeholders}) AND active = true ORDER BY favorite DESC, display_order ASC, created_at ASC`;
            const allImages = await query(imagesSql, productIds) as any[];

            // Buscar todos os preços
            const pricesSql = `SELECT id, product_id as productId, value, batch, quantidade_compra as quantidadeCompra, active, created_at as createdAt, updated_at as updatedAt FROM product_prices WHERE product_id IN (${placeholders}) AND active = true ORDER BY batch ASC`;
            const allPrices = await query(pricesSql, productIds) as any[];

            // Agrupar imagens e preços por produto
            const imagesByProduct: Record<number, any[]> = {};
            const pricesByProduct: Record<number, any[]> = {};

            allImages.forEach((img: any) => {
                if (!imagesByProduct[img.productId]) {
                    imagesByProduct[img.productId] = [];
                }
                imagesByProduct[img.productId].push(img);
            });

            allPrices.forEach((price: any) => {
                if (!pricesByProduct[price.productId]) {
                    pricesByProduct[price.productId] = [];
                }
                pricesByProduct[price.productId].push(price);
            });

            // Buscar contagem de compras por agência (se agencyId fornecido)
            let purchaseCountsByProduct: Record<number, number> = {};
            if (agencyId && productIds.length > 0) {
                const purchasePlaceholders = productIds.map(() => '?').join(',');
                const purchaseCountsSql = `
                    SELECT 
                        oi.product_id as productId,
                        COALESCE(SUM(oi.quantity), 0) as total
                    FROM order_items oi 
                    INNER JOIN orders o ON oi.order_id = o.id 
                    WHERE oi.product_id IN (${purchasePlaceholders}) AND o.agency_id = ? AND o.status = 'CONFIRMED'
                    GROUP BY oi.product_id
                `;
                const purchaseCounts = await query(purchaseCountsSql, [...productIds, agencyId]) as any[];
                
                purchaseCounts.forEach((row: any) => {
                    purchaseCountsByProduct[row.productId] = Number(row.total) || 0;
                });
            }

            // Adicionar imagens e preços aos produtos
            const productsWithDetails = data.map(product => {
                const images = imagesByProduct[product.id] || [];
                const prices = pricesByProduct[product.id] || [];
                
                // Ordenar preços por batch
                const sortedPrices = prices.sort((a: any, b: any) => a.batch - b.batch);
                
                // Buscar quantidade de compras da agência
                const agencyPurchaseCount = agencyId ? (purchaseCountsByProduct[product.id] || 0) : 0;
                
                // Determinar qual lote usar baseado na lógica de lotes
                let loteDisponivel: any = null;
                let podeComprar = false;
                
                if (sortedPrices.length > 0) {
                    // Percorrer os lotes em ordem
                    for (let i = 0; i < sortedPrices.length; i++) {
                        const lote = sortedPrices[i];
                        const quantidadeCompra = Number(lote.quantidadeCompra) || 0;
                        
                        // Se quantidade_compra for 0, fica liberado
                        if (quantidadeCompra === 0) {
                            loteDisponivel = lote;
                            podeComprar = true;
                            break;
                        }
                        
                        // Se quantidade_compra > 0, verificar agencyPurchaseCount
                        if (agencyPurchaseCount >= quantidadeCompra) {
                            // Se já comprou o suficiente, tentar próximo lote
                            continue;
                        } else {
                            // Ainda pode comprar neste lote
                            loteDisponivel = lote;
                            podeComprar = true;
                            break;
                        }
                    }
                    
                    // Se não encontrou lote disponível, não pode comprar
                    if (!loteDisponivel) {
                        podeComprar = false;
                    }
                }
                
                // Calcular menor e maior preço para exibição
                // Usar o lote disponível se existir, senão usar o primeiro lote
                const loteParaExibicao = loteDisponivel || sortedPrices[0];
                const primeiroLote = loteParaExibicao;
                const maiorPreco = prices.reduce((max: any, p: any) => 
                    Number(p.value) > Number(max.value) ? p : max, prices[0] || { value: 0 }
                );

                return {
                    ...product,
                    images,
                    prices,
                    primeiroLote: Number(primeiroLote?.value) || 0,
                    maiorPreco: Number(maiorPreco?.value) || 0,
                    agencyPurchaseCount: agencyId ? agencyPurchaseCount : undefined,
                    loteDisponivel: loteDisponivel ? {
                        id: loteDisponivel.id,
                        value: Number(loteDisponivel.value) || 0,
                        batch: Number(loteDisponivel.batch) || 0,
                    } : null,
                    podeComprar: podeComprar,
                };
            });

            const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
            const countResults = await query(countSql, values) as any[];
            const total = Array.isArray(countResults) && countResults.length > 0 ? (countResults[0].total as number) : 0;

            return { data: productsWithDetails, total };
        }

        const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
        const countResults = await query(countSql, values) as any[];
        const total = Array.isArray(countResults) && countResults.length > 0 ? (countResults[0].total as number) : 0;

        return { data, total };
    },

    // Buscar produto individual com imagens e preços incluídos
    async findByIdWithDetails(id: number, agencyId?: number): Promise<any | null> {
        const product = await this.findById(id);
        if (!product) {
            return null;
        }

        // Usar a mesma estrutura do findAllWithDetails
        const data = [product];
        const productIds = [id];

        // Buscar todas as imagens (priorizar favorita, depois por ordem)
        const imagesSql = `SELECT id, product_id as productId, path, name, active, display_order as displayOrder, favorite, created_at as createdAt, updated_at as updatedAt FROM product_images WHERE product_id = ? AND active = true ORDER BY favorite DESC, display_order ASC, created_at ASC`;
        const allImages = await query(imagesSql, [id]) as any[];

        // Buscar todos os preços
        const pricesSql = `SELECT id, product_id as productId, value, batch, quantidade_compra as quantidadeCompra, active, created_at as createdAt, updated_at as updatedAt FROM product_prices WHERE product_id = ? AND active = true ORDER BY batch ASC`;
        const allPrices = await query(pricesSql, [id]) as any[];

        // Agrupar imagens e preços por produto
        const imagesByProduct: Record<number, any[]> = {};
        const pricesByProduct: Record<number, any[]> = {};

        allImages.forEach((img: any) => {
            if (!imagesByProduct[img.productId]) {
                imagesByProduct[img.productId] = [];
            }
            imagesByProduct[img.productId].push(img);
        });

        allPrices.forEach((price: any) => {
            if (!pricesByProduct[price.productId]) {
                pricesByProduct[price.productId] = [];
            }
            pricesByProduct[price.productId].push(price);
        });

        // Buscar contagem de compras por agência (se agencyId fornecido)
        let purchaseCountsByProduct: Record<number, number> = {};
        if (agencyId && productIds.length > 0) {
            const purchasePlaceholders = productIds.map(() => '?').join(',');
            const purchaseCountsSql = `
                SELECT 
                    oi.product_id as productId,
                    COALESCE(SUM(oi.quantity), 0) as total
                FROM order_items oi 
                INNER JOIN orders o ON oi.order_id = o.id 
                WHERE oi.product_id IN (${purchasePlaceholders}) AND o.agency_id = ? AND o.status = 'CONFIRMED'
                GROUP BY oi.product_id
            `;
            const purchaseCounts = await query(purchaseCountsSql, [...productIds, agencyId]) as any[];
            
            purchaseCounts.forEach((row: any) => {
                purchaseCountsByProduct[row.productId] = Number(row.total) || 0;
            });
        }

        // Adicionar imagens e preços aos produtos (mesma lógica do findAllWithDetails)
        const productsWithDetails = data.map(product => {
            const images = imagesByProduct[product.id] || [];
            const prices = pricesByProduct[product.id] || [];
            
            // Ordenar preços por batch
            const sortedPrices = prices.sort((a: any, b: any) => a.batch - b.batch);
            
            // Buscar quantidade de compras da agência
            const agencyPurchaseCount = agencyId ? (purchaseCountsByProduct[product.id] || 0) : 0;
            
            // Determinar qual lote usar baseado na lógica de lotes
            let loteDisponivel: any = null;
            let podeComprar = false;
            
            if (sortedPrices.length > 0) {
                // Percorrer os lotes em ordem
                for (let i = 0; i < sortedPrices.length; i++) {
                    const lote = sortedPrices[i];
                    const quantidadeCompra = Number(lote.quantidadeCompra) || 0;
                    
                    // Se quantidade_compra for 0, fica liberado
                    if (quantidadeCompra === 0) {
                        loteDisponivel = lote;
                        podeComprar = true;
                        break;
                    }
                    
                    // Se quantidade_compra > 0, verificar agencyPurchaseCount
                    if (agencyPurchaseCount >= quantidadeCompra) {
                        // Se já comprou o suficiente, tentar próximo lote
                        continue;
                    } else {
                        // Ainda pode comprar neste lote
                        loteDisponivel = lote;
                        podeComprar = true;
                        break;
                    }
                }
                
                // Se não encontrou lote disponível, não pode comprar
                if (!loteDisponivel) {
                    podeComprar = false;
                }
            }
            
            // Calcular menor e maior preço para exibição
            // Usar o lote disponível se existir, senão usar o primeiro lote
            const loteParaExibicao = loteDisponivel || sortedPrices[0];
            const primeiroLote = loteParaExibicao;
            const maiorPreco = prices.reduce((max: any, p: any) => 
                Number(p.value) > Number(max.value) ? p : max, prices[0] || { value: 0 }
            );

            return {
                ...product,
                images,
                prices,
                primeiroLote: Number(primeiroLote?.value) || 0,
                maiorPreco: Number(maiorPreco?.value) || 0,
                agencyPurchaseCount: agencyId ? agencyPurchaseCount : undefined,
                loteDisponivel: loteDisponivel ? {
                    id: loteDisponivel.id,
                    value: Number(loteDisponivel.value) || 0,
                    batch: Number(loteDisponivel.batch) || 0,
                } : null,
                podeComprar: podeComprar,
            };
        });

        // Retornar o primeiro produto (único produto)
        return productsWithDetails[0] || null;
    }
};
