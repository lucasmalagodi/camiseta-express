import { query, pool } from '../config/db';
import { Order, OrderItem, CreateOrderDto } from '../types';
import { productVariantService } from './productVariantService';

export const orderService = {
    async create(agencyId: number, data: CreateOrderDto): Promise<number> {
        // Usar transação para garantir atomicidade
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Calcular total de pontos necessários
            let totalPoints = 0;
            const orderItemsData: Array<{ productId: number; productPriceId: number; variantId: number | null; quantity: number; pointsPerUnit: number }> = [];

            for (const item of data.items) {
                // Buscar produto usando connection da transação (com lock para evitar race conditions)
                const [productResults] = await connection.execute(
                    'SELECT id, category_id as categoryId, name, description, quantity, active, created_at as createdAt, updated_at as updatedAt FROM products WHERE id = ? FOR UPDATE',
                    [item.productId]
                ) as any[];

                if (!Array.isArray(productResults) || productResults.length === 0) {
                    throw new Error(`Product ${item.productId} not found`);
                }

                const product = productResults[0];
                
                if (!product.active) {
                    throw new Error(`Product ${product.name || item.productId} is inactive`);
                }

                // Validar estoque disponível
                // Se tem variantId, validar estoque da variação específica
                if (item.variantId) {
                    const [variantResults] = await connection.execute(
                        'SELECT id, product_id as productId, model, size, stock, active FROM product_variants WHERE id = ? AND product_id = ? FOR UPDATE',
                        [item.variantId, item.productId]
                    ) as any[];

                    if (!Array.isArray(variantResults) || variantResults.length === 0) {
                        throw new Error(`Product variant ${item.variantId} not found for product ${item.productId}`);
                    }

                    const variant = variantResults[0];
                    if (!variant.active) {
                        throw new Error(`Product variant ${variant.model} - ${variant.size} is inactive`);
                    }

                    const availableStock = Number(variant.stock) || 0;
                    if (availableStock < item.quantity) {
                        throw new Error(`Insufficient stock for product ${product.name || item.productId} variant ${variant.model} - ${variant.size}. Available: ${availableStock}, Requested: ${item.quantity}`);
                    }
                } else {
                    // Validar estoque geral do produto (sem variação)
                    const availableStock = Number(product.quantity) || 0;
                    if (availableStock < item.quantity) {
                        throw new Error(`Insufficient stock for product ${product.name || item.productId}. Available: ${availableStock}, Requested: ${item.quantity}`);
                    }
                }

                // Buscar preços ativos usando connection da transação
                const [priceResults] = await connection.execute(
                    'SELECT id, product_id as productId, value, batch, quantidade_compra as quantidadeCompra, active, created_at as createdAt, updated_at as updatedAt FROM product_prices WHERE product_id = ? AND active = true ORDER BY batch ASC',
                    [item.productId]
                ) as any[];

                const activePrices = Array.isArray(priceResults) ? priceResults : [];
                if (activePrices.length === 0) {
                    throw new Error(`No active price found for product ${product.name || item.productId}`);
                }

                // Distribuir unidades entre os lotes conforme quantidade_compra
                let remainingQuantity = item.quantity;
                let priceIndex = 0;

                // Contar quantas unidades a agência já comprou deste produto (total)
                const [totalUnitsPurchasedResults] = await connection.execute(
                    `SELECT COALESCE(SUM(oi.quantity), 0) as total 
                     FROM order_items oi 
                     INNER JOIN orders o ON oi.order_id = o.id 
                     WHERE oi.product_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'`,
                    [item.productId, agencyId]
                ) as any[];
                
                const totalUnitsPurchased = Array.isArray(totalUnitsPurchasedResults) && totalUnitsPurchasedResults.length > 0
                    ? Number(totalUnitsPurchasedResults[0].total)
                    : 0;

                // Distribuir unidades pelos lotes
                while (remainingQuantity > 0 && priceIndex < activePrices.length) {
                    const price = activePrices[priceIndex];
                    const quantidadeCompra = Number(price.quantidadeCompra) || 0;
                    
                    let unitsForThisLot = 0;

                    if (quantidadeCompra === 0) {
                        // Se quantidade_compra = 0: permite apenas 1 unidade por agência (qualquer lote)
                        // Verificar se já comprou alguma unidade
                        if (totalUnitsPurchased === 0) {
                            // Pode comprar apenas 1 unidade neste lote
                            unitsForThisLot = Math.min(remainingQuantity, 1);
                        }
                        // Se já comprou, não pode mais comprar neste lote (vai para o próximo)
                    } else {
                        // Se quantidade_compra > 0: permite até quantidade_compra unidades neste lote
                        // Calcular quantas unidades já foram compradas neste lote específico
                        const [lotUnitsPurchasedResults] = await connection.execute(
                            `SELECT COALESCE(SUM(oi.quantity), 0) as total 
                             FROM order_items oi 
                             INNER JOIN orders o ON oi.order_id = o.id 
                             WHERE oi.product_id = ? AND oi.product_price_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'`,
                            [item.productId, price.id, agencyId]
                        ) as any[];
                        
                        const lotUnitsPurchased = Array.isArray(lotUnitsPurchasedResults) && lotUnitsPurchasedResults.length > 0
                            ? Number(lotUnitsPurchasedResults[0].total)
                            : 0;

                        // Calcular quantas unidades ainda podem ser compradas neste lote
                        const availableInLot = quantidadeCompra - lotUnitsPurchased;
                        
                        if (availableInLot > 0) {
                            // Pode comprar até availableInLot unidades neste lote
                            unitsForThisLot = Math.min(remainingQuantity, availableInLot);
                        }
                        // Se não há mais espaço neste lote, vai para o próximo
                    }

                    if (unitsForThisLot > 0) {
                        const pricePerUnit = Number(price.value);
                        const itemTotal = pricePerUnit * unitsForThisLot;
                        totalPoints += itemTotal;

                        orderItemsData.push({
                            productId: item.productId,
                            productPriceId: price.id,
                            variantId: item.variantId || null,
                            quantity: unitsForThisLot,
                            pointsPerUnit: pricePerUnit
                        });

                        remainingQuantity -= unitsForThisLot;
                    }

                    priceIndex++;
                }

                // Se ainda há unidades restantes e não há mais lotes, não pode comprar
                if (remainingQuantity > 0) {
                    throw new Error(`Product ${product.name || item.productId} is no longer available for purchase by this agency. Purchase limit reached. Only ${item.quantity - remainingQuantity} of ${item.quantity} units could be allocated.`);
                }
            }

            // Verificar balance da agência usando connection da transação
            const [balanceResults] = await connection.execute(
                'SELECT COALESCE(SUM(points), 0) as balance FROM agency_points_ledger WHERE agency_id = ?',
                [agencyId]
            ) as any[];

            const balance = Array.isArray(balanceResults) && balanceResults.length > 0 
                ? Number(balanceResults[0].balance) 
                : 0;

            if (balance < totalPoints) {
                throw new Error(`Insufficient points. Required: ${totalPoints}, Available: ${balance}`);
            }

            // Criar order com status PENDING
            const [orderResult] = await connection.execute(
                'INSERT INTO orders (agency_id, total_points, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                [agencyId, totalPoints, 'PENDING']
            ) as any;

            const orderId = orderResult.insertId;

            // Criar order items e decrementar estoque atomicamente
            for (const item of orderItemsData) {
                await connection.execute(
                    'INSERT INTO order_items (order_id, product_id, product_price_id, product_variant_id, quantity, points_per_unit) VALUES (?, ?, ?, ?, ?, ?)',
                    [orderId, item.productId, item.productPriceId, item.variantId, item.quantity, item.pointsPerUnit]
                );

                // Decrementar estoque: se tem variantId, decrementar da variação, senão do produto geral
                if (item.variantId) {
                    await connection.execute(
                        'UPDATE product_variants SET stock = stock - ?, updated_at = NOW() WHERE id = ? AND stock >= ?',
                        [item.quantity, item.variantId, item.quantity]
                    );
                } else {
                    await connection.execute(
                        'UPDATE products SET quantity = quantity - ?, updated_at = NOW() WHERE id = ?',
                        [item.quantity, item.productId]
                    );
                }
            }

            // Criar ledger entry (debit negativo)
            await connection.execute(
                'INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [
                    agencyId,
                    'REDEEM',
                    orderId,
                    -totalPoints,
                    `Order ${orderId} redemption`
                ]
            );

            // Atualizar order status para CONFIRMED
            await connection.execute(
                'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
                ['CONFIRMED', orderId]
            );

            await connection.commit();

            // Enviar emails de notificação usando NotificationService (não bloquear se falhar)
            try {
                const { notificationService } = await import('./notificationService');
                const { emailService } = await import('./emailService');
                const { agencyService } = await import('./agencyService');
                const agency = await agencyService.findById(agencyId);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const orderUrl = `${frontendUrl}/admin/pedidos/${orderId}`;
                
                if (agency) {
                    // Enviar email para admins (mantém compatibilidade com sistema antigo)
                    await emailService.sendNewOrderNotification(
                        orderId,
                        agency.name,
                        totalPoints,
                        orderUrl
                    );

                    // Enviar email usando roteamento dinâmico baseado em agency/executive/branch
                    await notificationService.sendOrderNotification(
                        orderId,
                        agencyId,
                        agency.name,
                        totalPoints,
                        orderUrl
                    );
                }
            } catch (emailError) {
                console.error('Error sending order notification emails:', emailError);
                // Não bloquear o fluxo se o envio de email falhar
            }

            return orderId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async findById(id: number): Promise<Order | null> {
        const results = await query(
            'SELECT id, agency_id as agencyId, total_points as totalPoints, status, created_at as createdAt, updated_at as updatedAt FROM orders WHERE id = ?',
            [id]
        ) as Order[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findByAgencyId(agencyId: number): Promise<Order[]> {
        const results = await query(
            'SELECT id, agency_id as agencyId, total_points as totalPoints, status, created_at as createdAt, updated_at as updatedAt FROM orders WHERE agency_id = ? ORDER BY created_at DESC',
            [agencyId]
        ) as Order[];

        return Array.isArray(results) ? results : [];
    },

    async findItemsByOrderId(orderId: number): Promise<Array<OrderItem & { productName: string; model: string | null; size: string | null }>> {
        const results = await query(
            `SELECT 
                oi.id,
                oi.order_id as orderId,
                oi.product_id as productId,
                oi.product_price_id as productPriceId,
                oi.product_variant_id as productVariantId,
                oi.quantity,
                oi.points_per_unit as pointsPerUnit,
                p.name as productName,
                COALESCE(pv.model, NULL) as model,
                COALESCE(pv.size, NULL) as size
             FROM order_items oi
             INNER JOIN products p ON oi.product_id = p.id
             LEFT JOIN product_variants pv ON oi.product_variant_id = pv.id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC`,
            [orderId]
        ) as any[];

        return Array.isArray(results) ? results.map((r: any) => ({
            id: Number(r.id),
            orderId: Number(r.orderId),
            productId: Number(r.productId),
            productPriceId: r.productPriceId ? Number(r.productPriceId) : null,
            productVariantId: r.productVariantId ? Number(r.productVariantId) : null,
            quantity: Number(r.quantity),
            pointsPerUnit: Number(r.pointsPerUnit),
            productName: r.productName,
            model: r.model || null,
            size: r.size || null
        })) : [];
    },

    async findAll(): Promise<Order[]> {
        const results = await query(
            'SELECT id, agency_id as agencyId, total_points as totalPoints, status, created_at as createdAt, updated_at as updatedAt FROM orders ORDER BY created_at DESC'
        ) as Order[];

        return Array.isArray(results) ? results : [];
    },

    async getLatestOrder(): Promise<Order | null> {
        const results = await query(
            'SELECT id, agency_id as agencyId, total_points as totalPoints, status, created_at as createdAt, updated_at as updatedAt FROM orders ORDER BY created_at DESC LIMIT 1'
        ) as Order[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async cancel(orderId: number): Promise<void> {
        const order = await this.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status !== 'PENDING') {
            throw new Error('Only PENDING orders can be canceled');
        }

        await query(
            'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
            ['CANCELED', orderId]
        );
    },

    async getProductPurchaseCount(agencyId: number, productId: number): Promise<{ totalUnits: number; purchasesByLot: Array<{ priceId: number; batch: number; units: number }> }> {
        // Contar total de unidades compradas deste produto pela agência
        const [totalResults] = await query(
            `SELECT COALESCE(SUM(oi.quantity), 0) as total 
             FROM order_items oi 
             INNER JOIN orders o ON oi.order_id = o.id 
             WHERE oi.product_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'`,
            [productId, agencyId]
        ) as any[];

        const totalUnits = Array.isArray(totalResults) && totalResults.length > 0
            ? Number(totalResults[0].total)
            : 0;

        // Contar unidades compradas por lote
        const [lotResults] = await query(
            `SELECT 
                oi.product_price_id as priceId,
                pp.batch,
                COALESCE(SUM(oi.quantity), 0) as units
             FROM order_items oi 
             INNER JOIN orders o ON oi.order_id = o.id 
             INNER JOIN product_prices pp ON oi.product_price_id = pp.id
             WHERE oi.product_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'
             GROUP BY oi.product_price_id, pp.batch
             ORDER BY pp.batch ASC`,
            [productId, agencyId]
        ) as any[];

        const purchasesByLot = Array.isArray(lotResults) 
            ? lotResults.map((r: any) => ({
                priceId: Number(r.priceId),
                batch: Number(r.batch),
                units: Number(r.units)
            }))
            : [];

        return {
            totalUnits,
            purchasesByLot
        };
    },

    // Buscar pedidos da agência com contagem de itens
    async findMyOrders(agencyId: number): Promise<Array<Order & { itemsCount: number }>> {
        const results = await query(
            `SELECT 
                o.id,
                o.agency_id as agencyId,
                o.total_points as totalPoints,
                o.status,
                o.created_at as createdAt,
                o.updated_at as updatedAt,
                COUNT(oi.id) as itemsCount
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             WHERE o.agency_id = ?
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [agencyId]
        ) as any[];

        return Array.isArray(results) ? results.map((r: any) => ({
            id: Number(r.id),
            agencyId: Number(r.agencyId),
            totalPoints: Number(r.totalPoints),
            status: r.status,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            itemsCount: Number(r.itemsCount) || 0
        })) : [];
    },

    // Buscar pedido por ID com validação de agência e itens completos
    async findMyOrderById(orderId: number, agencyId: number): Promise<(Order & { items: Array<OrderItem & { productName: string; model: string | null; size: string | null }> }) | null> {
        // Buscar pedido e validar ownership
        const order = await this.findById(orderId);
        if (!order || order.agencyId !== agencyId) {
            return null;
        }

        // Buscar itens com informações do produto e variante
        const itemsResults = await query(
            `SELECT 
                oi.id,
                oi.order_id as orderId,
                oi.product_id as productId,
                oi.product_price_id as productPriceId,
                oi.product_variant_id as productVariantId,
                oi.quantity,
                oi.points_per_unit as pointsPerUnit,
                p.name as productName,
                COALESCE(pv.model, NULL) as model,
                COALESCE(pv.size, NULL) as size
             FROM order_items oi
             INNER JOIN products p ON oi.product_id = p.id
             LEFT JOIN product_variants pv ON oi.product_variant_id = pv.id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC`,
            [orderId]
        ) as any[];

        const items = Array.isArray(itemsResults) ? itemsResults.map((r: any) => ({
            id: Number(r.id),
            orderId: Number(r.orderId),
            productId: Number(r.productId),
            productPriceId: r.productPriceId ? Number(r.productPriceId) : null,
            productVariantId: r.productVariantId ? Number(r.productVariantId) : null,
            quantity: Number(r.quantity),
            pointsPerUnit: Number(r.pointsPerUnit),
            productName: r.productName,
            model: r.model || null,
            size: r.size || null
        })) : [];

        return {
            ...order,
            items
        };
    }
};
