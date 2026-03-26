import { query, pool } from '../config/db';
import { Order, OrderItem, CreateOrderDto, OrderCancellation } from '../types';
import { productVariantService } from './productVariantService';

export interface CancelOrderWithReasonDto {
    reason: string;
    sendEmail?: boolean;
    emailMessage?: string;
}

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

                // Distribuir unidades pelos lotes (cada lote tem seu limite; mesmo produto outra variante usa próximo lote)
                while (remainingQuantity > 0 && priceIndex < activePrices.length) {
                    const price = activePrices[priceIndex];
                    const quantidadeCompra = Number(price.quantidadeCompra) || 0;
                    
                    let unitsForThisLot = 0;

                    // Contagem por lote (pedidos confirmados + mesmo pedido) para qualquer quantidade_compra
                    const [lotUnitsPurchasedResults] = await connection.execute(
                        `SELECT COALESCE(SUM(oi.quantity), 0) as total 
                         FROM order_items oi 
                         INNER JOIN orders o ON oi.order_id = o.id 
                         WHERE oi.product_id = ? AND oi.product_price_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'`,
                        [item.productId, price.id, agencyId]
                    ) as any[];
                    const lotFromDb = Array.isArray(lotUnitsPurchasedResults) && lotUnitsPurchasedResults.length > 0
                        ? Number(lotUnitsPurchasedResults[0].total)
                        : 0;
                    const lotUnitsAlreadyInThisOrder = orderItemsData
                        .filter((x) => x.productId === item.productId && x.productPriceId === price.id)
                        .reduce((sum, x) => sum + x.quantity, 0);
                    const lotUnitsPurchased = lotFromDb + lotUnitsAlreadyInThisOrder;

                    if (quantidadeCompra === 0) {
                        // quantidade_compra = 0: permite 1 unidade por agência por lote (não no total)
                        if (lotUnitsPurchased === 0 && remainingQuantity > 0) {
                            unitsForThisLot = Math.min(remainingQuantity, 1);
                        }
                    } else {
                        // quantidade_compra > 0: permite até quantidade_compra unidades neste lote
                        const availableInLot = quantidadeCompra - lotUnitsPurchased;
                        if (availableInLot > 0) {
                            unitsForThisLot = Math.min(remainingQuantity, availableInLot);
                        }
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
                const { getPublicFrontendUrl } = await import('../config/frontendUrl');
                const orderUrl = `${getPublicFrontendUrl()}/admin/pedidos/${orderId}`;
                
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

    /**
     * Admin: troca a variação (modelo/tamanho) de um item do pedido.
     * Regra: só troca se houver estoque disponível na nova variação e, ao trocar, devolve o estoque da antiga.
     * Por segurança, bloqueia alteração se o pedido já estiver vinculado a uma remessa.
     */
    async updateOrderItemVariant(
        orderId: number,
        itemId: number,
        newProductVariantId: number
    ): Promise<{
        orderId: number;
        itemId: number;
        oldProductVariantId: number | null;
        newProductVariantId: number;
        quantity: number;
    }> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [orderRows] = await connection.execute(
                `SELECT id, status FROM orders WHERE id = ? FOR UPDATE`,
                [orderId]
            ) as any[];
            const ord = Array.isArray(orderRows) && orderRows[0] ? orderRows[0] : null;
            if (!ord) {
                await connection.rollback();
                throw new Error('Pedido não encontrado.');
            }
            if (ord.status !== 'CONFIRMED') {
                await connection.rollback();
                throw new Error('Só é possível alterar itens em pedidos CONFIRMED.');
            }

            const [shipLinkRows] = await connection.execute(
                `SELECT 1 as linked FROM shipment_orders WHERE order_id = ? LIMIT 1`,
                [orderId]
            ) as any[];
            if (Array.isArray(shipLinkRows) && shipLinkRows.length > 0) {
                await connection.rollback();
                throw new Error('Pedido já está vinculado a uma remessa; não é possível alterar tipo/tamanho.');
            }

            const [itemRows] = await connection.execute(
                `SELECT id, product_id as productId, product_variant_id as productVariantId, quantity
                 FROM order_items
                 WHERE id = ? AND order_id = ?
                 FOR UPDATE`,
                [itemId, orderId]
            ) as any[];
            const it = Array.isArray(itemRows) && itemRows[0] ? itemRows[0] : null;
            if (!it) {
                await connection.rollback();
                throw new Error('Item do pedido não encontrado.');
            }

            const quantity = Number(it.quantity) || 0;
            if (quantity <= 0) {
                await connection.rollback();
                throw new Error('Quantidade do item inválida.');
            }

            const productId = Number(it.productId);
            const oldVariantId = it.productVariantId != null ? Number(it.productVariantId) : null;
            const newVariantId = Number(newProductVariantId);

            if (oldVariantId != null && oldVariantId === newVariantId) {
                await connection.rollback();
                throw new Error('A nova variação é igual à atual.');
            }

            const [newVarRows] = await connection.execute(
                `SELECT id, product_id as productId, stock, active
                 FROM product_variants
                 WHERE id = ?
                 FOR UPDATE`,
                [newVariantId]
            ) as any[];
            const newVar = Array.isArray(newVarRows) && newVarRows[0] ? newVarRows[0] : null;
            if (!newVar) {
                await connection.rollback();
                throw new Error('Variação de destino não encontrada.');
            }
            if (Number(newVar.productId) !== productId) {
                await connection.rollback();
                throw new Error('Variação de destino não pertence ao mesmo produto do item.');
            }
            if (!newVar.active) {
                await connection.rollback();
                throw new Error('Variação de destino está inativa.');
            }

            const available = Number(newVar.stock) || 0;
            if (available < quantity) {
                await connection.rollback();
                throw new Error(
                    `Sem estoque suficiente para a nova variação. Disponível: ${available}, necessário: ${quantity}.`
                );
            }

            if (oldVariantId != null) {
                const [oldVarRows] = await connection.execute(
                    `SELECT id, product_id as productId FROM product_variants WHERE id = ? FOR UPDATE`,
                    [oldVariantId]
                ) as any[];
                const oldVar = Array.isArray(oldVarRows) && oldVarRows[0] ? oldVarRows[0] : null;
                if (!oldVar) {
                    await connection.rollback();
                    throw new Error('Variação atual não encontrada (dados inconsistentes).');
                }
                if (Number(oldVar.productId) !== productId) {
                    await connection.rollback();
                    throw new Error('Variação atual não pertence ao mesmo produto do item (dados inconsistentes).');
                }
            }

            // 1) Reserva na nova (-qty)  2) Devolve na antiga (+qty)  3) Atualiza item
            const [updNew] = await connection.execute(
                `UPDATE product_variants SET stock = stock - ?, updated_at = NOW()
                 WHERE id = ? AND stock >= ?`,
                [quantity, newVariantId, quantity]
            ) as any[];
            const affectedNew = Number(updNew?.affectedRows ?? 0);
            if (affectedNew !== 1) {
                await connection.rollback();
                throw new Error('Não foi possível reservar estoque na nova variação.');
            }

            if (oldVariantId != null) {
                await connection.execute(
                    `UPDATE product_variants SET stock = stock + ?, updated_at = NOW()
                     WHERE id = ?`,
                    [quantity, oldVariantId]
                );
            }

            await connection.execute(
                `UPDATE order_items SET product_variant_id = ? WHERE id = ? AND order_id = ?`,
                [newVariantId, itemId, orderId]
            );

            await connection.commit();
            return {
                orderId,
                itemId,
                oldProductVariantId: oldVariantId,
                newProductVariantId: newVariantId,
                quantity
            };
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    async findAll(): Promise<Array<Order & { productsSummary: string; agencyName: string }>> {
        const results = await query(
            `SELECT 
                o.id,
                o.agency_id as agencyId,
                a.name as agencyName,
                o.total_points as totalPoints,
                o.status,
                o.created_at as createdAt,
                o.updated_at as updatedAt,
                COALESCE(GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, 'x)') ORDER BY oi.id SEPARATOR ', '), '') as productsSummary
             FROM orders o
             INNER JOIN agencies a ON o.agency_id = a.id
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.id
             GROUP BY o.id, o.agency_id, a.name, o.total_points, o.status, o.created_at, o.updated_at
             ORDER BY o.created_at DESC`
        ) as any[];

        return Array.isArray(results) ? results.map((r: any) => ({
            id: Number(r.id),
            agencyId: Number(r.agencyId),
            agencyName: r.agencyName,
            totalPoints: Number(r.totalPoints),
            status: r.status,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            productsSummary: r.productsSummary || ''
        })) : [];
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

    /**
     * Cancela pedido CONFIRMED com motivo, extornando pontos e revertendo estoque.
     * Grava o cancelamento em order_cancellations e opcionalmente envia e-mail.
     */
    async cancelWithReason(orderId: number, data: CancelOrderWithReasonDto): Promise<OrderCancellation> {
        const order = await this.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        if (order.status !== 'CONFIRMED') {
            throw new Error('Only CONFIRMED orders can be canceled with reason. Current status: ' + order.status);
        }

        const items = await this.findItemsByOrderId(orderId);
        if (items.length === 0) {
            throw new Error('Order has no items');
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Inserir registro de cancelamento
            const [cancelResult] = await connection.execute(
                `INSERT INTO order_cancellations (order_id, reason, email_sent, email_body, created_at)
                 VALUES (?, ?, FALSE, ?, NOW())`,
                [orderId, data.reason.trim(), data.emailMessage?.trim() || null]
            ) as any;
            const cancellationId = cancelResult.insertId;

            // Extornar pontos: entrada positiva no ledger (REFUND)
            await connection.execute(
                `INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at)
                 VALUES (?, 'REFUND', ?, ?, ?, NOW())`,
                [
                    order.agencyId,
                    cancellationId,
                    order.totalPoints,
                    `Extorno cancelamento pedido #${orderId}`
                ]
            );

            // Reverter estoque de cada item
            for (const item of items) {
                if (item.productVariantId) {
                    await connection.execute(
                        'UPDATE product_variants SET stock = stock + ?, updated_at = NOW() WHERE id = ?',
                        [item.quantity, item.productVariantId]
                    );
                } else {
                    await connection.execute(
                        'UPDATE products SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?',
                        [item.quantity, item.productId]
                    );
                }
            }

            // Marcar pedido como cancelado
            await connection.execute(
                'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
                ['CANCELED', orderId]
            );

            await connection.commit();
            connection.release();

            const cancellation: OrderCancellation = {
                id: cancellationId,
                orderId,
                reason: data.reason.trim(),
                emailSent: false,
                emailBody: data.emailMessage?.trim() || null,
                createdAt: new Date()
            };

            // Enviar e-mail fora da transação (não bloquear se falhar)
            if (data.sendEmail && data.reason.trim()) {
                try {
                    const { emailService } = await import('./emailService');
                    const { agencyService } = await import('./agencyService');
                    const agency = await agencyService.findById(order.agencyId);
                    if (agency?.email) {
                        const message = (data.emailMessage?.trim() || data.reason.trim()).replace(/\n/g, '<br>');
                        await emailService.sendOrderCancellationEmail(
                            agency.email,
                            agency.name,
                            orderId,
                            order.totalPoints,
                            message
                        );
                        await query(
                            'UPDATE order_cancellations SET email_sent = TRUE WHERE id = ?',
                            [cancellationId]
                        );
                        cancellation.emailSent = true;
                    }
                } catch (emailError) {
                    console.error('Error sending order cancellation email:', emailError);
                }
            }

            return cancellation;
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    },

    async getCancellationByOrderId(orderId: number): Promise<OrderCancellation | null> {
        const results = await query(
            `SELECT id, order_id as orderId, reason, email_sent as emailSent, email_body as emailBody, created_at as createdAt
             FROM order_cancellations WHERE order_id = ?`,
            [orderId]
        ) as any[];
        if (!Array.isArray(results) || results.length === 0) return null;
        const r = results[0];
        return {
            id: r.id,
            orderId: r.orderId,
            reason: r.reason,
            emailSent: Boolean(r.emailSent),
            emailBody: r.emailBody,
            createdAt: r.createdAt
        };
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
