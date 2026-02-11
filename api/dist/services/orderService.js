"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = void 0;
const db_1 = require("../config/db");
exports.orderService = {
    async create(agencyId, data) {
        // Usar transação para garantir atomicidade
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            // Calcular total de pontos necessários
            let totalPoints = 0;
            const orderItemsData = [];
            for (const item of data.items) {
                // Buscar produto usando connection da transação (com lock para evitar race conditions)
                const [productResults] = await connection.execute('SELECT id, category_id as categoryId, name, description, quantity, active, created_at as createdAt, updated_at as updatedAt FROM products WHERE id = ? FOR UPDATE', [item.productId]);
                if (!Array.isArray(productResults) || productResults.length === 0) {
                    throw new Error(`Product ${item.productId} not found`);
                }
                const product = productResults[0];
                if (!product.active) {
                    throw new Error(`Product ${product.name || item.productId} is inactive`);
                }
                // Validar estoque disponível
                const availableStock = Number(product.quantity) || 0;
                if (availableStock < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.name || item.productId}. Available: ${availableStock}, Requested: ${item.quantity}`);
                }
                // Buscar preços ativos usando connection da transação
                const [priceResults] = await connection.execute('SELECT id, product_id as productId, value, batch, quantidade_compra as quantidadeCompra, active, created_at as createdAt, updated_at as updatedAt FROM product_prices WHERE product_id = ? AND active = true ORDER BY batch ASC', [item.productId]);
                const activePrices = Array.isArray(priceResults) ? priceResults : [];
                if (activePrices.length === 0) {
                    throw new Error(`No active price found for product ${product.name || item.productId}`);
                }
                // Distribuir unidades entre os lotes conforme quantidade_compra
                let remainingQuantity = item.quantity;
                let priceIndex = 0;
                // Contar quantas unidades a agência já comprou deste produto (total)
                const [totalUnitsPurchasedResults] = await connection.execute(`SELECT COALESCE(SUM(oi.quantity), 0) as total 
                     FROM order_items oi 
                     INNER JOIN orders o ON oi.order_id = o.id 
                     WHERE oi.product_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'`, [item.productId, agencyId]);
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
                    }
                    else {
                        // Se quantidade_compra > 0: permite até quantidade_compra unidades neste lote
                        // Calcular quantas unidades já foram compradas neste lote específico
                        const [lotUnitsPurchasedResults] = await connection.execute(`SELECT COALESCE(SUM(oi.quantity), 0) as total 
                             FROM order_items oi 
                             INNER JOIN orders o ON oi.order_id = o.id 
                             WHERE oi.product_id = ? AND oi.product_price_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'`, [item.productId, price.id, agencyId]);
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
            const [balanceResults] = await connection.execute('SELECT COALESCE(SUM(points), 0) as balance FROM agency_points_ledger WHERE agency_id = ?', [agencyId]);
            const balance = Array.isArray(balanceResults) && balanceResults.length > 0
                ? Number(balanceResults[0].balance)
                : 0;
            if (balance < totalPoints) {
                throw new Error(`Insufficient points. Required: ${totalPoints}, Available: ${balance}`);
            }
            // Criar order com status PENDING
            const [orderResult] = await connection.execute('INSERT INTO orders (agency_id, total_points, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [agencyId, totalPoints, 'PENDING']);
            const orderId = orderResult.insertId;
            // Criar order items e decrementar estoque atomicamente
            for (const item of orderItemsData) {
                await connection.execute('INSERT INTO order_items (order_id, product_id, product_price_id, quantity, points_per_unit) VALUES (?, ?, ?, ?, ?)', [orderId, item.productId, item.productPriceId, item.quantity, item.pointsPerUnit]);
                // Decrementar estoque do produto
                await connection.execute('UPDATE products SET quantity = quantity - ?, updated_at = NOW() WHERE id = ?', [item.quantity, item.productId]);
            }
            // Criar ledger entry (debit negativo)
            await connection.execute('INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [
                agencyId,
                'REDEEM',
                orderId,
                -totalPoints,
                `Order ${orderId} redemption`
            ]);
            // Atualizar order status para CONFIRMED
            await connection.execute('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', ['CONFIRMED', orderId]);
            await connection.commit();
            // Enviar emails de notificação (não bloquear se falhar)
            try {
                const { emailService } = await Promise.resolve().then(() => __importStar(require('./emailService')));
                const { agencyService } = await Promise.resolve().then(() => __importStar(require('./agencyService')));
                const agency = await agencyService.findById(agencyId);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const orderUrl = `${frontendUrl}/admin/pedidos/${orderId}`;
                if (agency) {
                    // Enviar email para admins
                    await emailService.sendNewOrderNotification(orderId, agency.name, totalPoints, orderUrl);
                    // Buscar e enviar email para executivo relacionado
                    try {
                        // Normalizar CNPJ para buscar (remover formatação)
                        const normalizedCnpj = agency.cnpj.replace(/[^\d]/g, '');
                        // Buscar executive_name na tabela agency_points_import_items pelo CNPJ
                        const { query } = await Promise.resolve().then(() => __importStar(require('../config/db')));
                        const importItems = await query('SELECT executive_name FROM agency_points_import_items WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, ".", ""), "/", ""), "-", ""), " ", "") = ? LIMIT 1', [normalizedCnpj]);
                        if (Array.isArray(importItems) && importItems.length > 0) {
                            const executiveName = importItems[0].executive_name;
                            // Buscar executivo pelo código (que corresponde ao executive_name)
                            const { executiveService } = await Promise.resolve().then(() => __importStar(require('./executiveService')));
                            const executive = await executiveService.findByExecutiveName(executiveName);
                            if (executive && executive.active) {
                                await emailService.sendExecutiveOrderNotification(orderId, agency.name, agency.cnpj, totalPoints, orderUrl, executive.email, executive.name || undefined);
                            }
                        }
                    }
                    catch (executiveEmailError) {
                        console.error('Error sending executive order notification email:', executiveEmailError);
                        // Não bloquear o fluxo se o envio de email ao executivo falhar
                    }
                }
            }
            catch (emailError) {
                console.error('Error sending order notification emails:', emailError);
                // Não bloquear o fluxo se o envio de email falhar
            }
            return orderId;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, agency_id as agencyId, total_points as totalPoints, status, created_at as createdAt, updated_at as updatedAt FROM orders WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByAgencyId(agencyId) {
        const results = await (0, db_1.query)('SELECT id, agency_id as agencyId, total_points as totalPoints, status, created_at as createdAt, updated_at as updatedAt FROM orders WHERE agency_id = ? ORDER BY created_at DESC', [agencyId]);
        return Array.isArray(results) ? results : [];
    },
    async findItemsByOrderId(orderId) {
        const results = await (0, db_1.query)('SELECT id, order_id as orderId, product_id as productId, product_price_id as productPriceId, quantity, points_per_unit as pointsPerUnit FROM order_items WHERE order_id = ?', [orderId]);
        return Array.isArray(results) ? results : [];
    },
    async findAll() {
        const results = await (0, db_1.query)('SELECT id, agency_id as agencyId, total_points as totalPoints, status, created_at as createdAt, updated_at as updatedAt FROM orders ORDER BY created_at DESC');
        return Array.isArray(results) ? results : [];
    },
    async getLatestOrder() {
        const results = await (0, db_1.query)('SELECT id, agency_id as agencyId, total_points as totalPoints, status, created_at as createdAt, updated_at as updatedAt FROM orders ORDER BY created_at DESC LIMIT 1');
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async cancel(orderId) {
        const order = await this.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        if (order.status !== 'PENDING') {
            throw new Error('Only PENDING orders can be canceled');
        }
        await (0, db_1.query)('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', ['CANCELED', orderId]);
    },
    async getProductPurchaseCount(agencyId, productId) {
        // Contar total de unidades compradas deste produto pela agência
        const [totalResults] = await (0, db_1.query)(`SELECT COALESCE(SUM(oi.quantity), 0) as total 
             FROM order_items oi 
             INNER JOIN orders o ON oi.order_id = o.id 
             WHERE oi.product_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'`, [productId, agencyId]);
        const totalUnits = Array.isArray(totalResults) && totalResults.length > 0
            ? Number(totalResults[0].total)
            : 0;
        // Contar unidades compradas por lote
        const [lotResults] = await (0, db_1.query)(`SELECT 
                oi.product_price_id as priceId,
                pp.batch,
                COALESCE(SUM(oi.quantity), 0) as units
             FROM order_items oi 
             INNER JOIN orders o ON oi.order_id = o.id 
             INNER JOIN product_prices pp ON oi.product_price_id = pp.id
             WHERE oi.product_id = ? AND o.agency_id = ? AND o.status = 'CONFIRMED'
             GROUP BY oi.product_price_id, pp.batch
             ORDER BY pp.batch ASC`, [productId, agencyId]);
        const purchasesByLot = Array.isArray(lotResults)
            ? lotResults.map((r) => ({
                priceId: Number(r.priceId),
                batch: Number(r.batch),
                units: Number(r.units)
            }))
            : [];
        return {
            totalUnits,
            purchasesByLot
        };
    }
};
