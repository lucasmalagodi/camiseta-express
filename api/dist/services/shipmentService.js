"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shipmentService = void 0;
const db_1 = require("../config/db");
const addressService_1 = require("./addressService");
const orderService_1 = require("./orderService");
function mapShipmentRow(r) {
    return {
        id: Number(r.id),
        agencyId: Number(r.agencyId),
        status: r.status,
        shippingMethod: r.shippingMethod,
        trackingCode: r.trackingCode ?? null,
        labelUrl: r.labelUrl ?? null,
        postedAt: r.postedAt ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
    };
}
/** mysql2 costuma devolver array; em alguns casos uma única linha pode vir como objeto — normaliza para sempre iterar todos os pedidos. */
function normalizeMysqlRows(rows) {
    if (rows == null)
        return [];
    if (Array.isArray(rows))
        return rows;
    if (typeof rows === 'object')
        return [rows];
    return [];
}
function csvEscapeCell(v) {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s))
        return `"${s.replace(/"/g, '""')}"`;
    return s;
}
function csvFormatModel(model) {
    if (!model)
        return '';
    switch (model) {
        case 'MASCULINO':
            return 'Masculino';
        case 'FEMININO':
            return 'Feminino';
        case 'UNISEX':
            return 'Unisex';
        default:
            return model;
    }
}
function csvDeliveryLine(addr) {
    if (!addr)
        return '';
    const parts = [
        `${addr.street}, ${addr.number}`,
        addr.complement,
        `${addr.neighborhood} — ${addr.city}/${addr.state}`,
        `CEP ${addr.cep}`
    ].filter(Boolean);
    return parts.join(' | ');
}
async function loadAgencyForPreparation(agencyId) {
    const agencyRows = await (0, db_1.query)(`SELECT a.id, a.cnpj, a.name, a.email, a.phone, a.branch_id as branchId, b.name as branchName,
                a.executive_id as executiveId, e.name as executiveName
         FROM agencies a
         LEFT JOIN branches b ON a.branch_id = b.id
         LEFT JOIN executives e ON a.executive_id = e.id
         WHERE a.id = ?`, [agencyId]);
    const ar = Array.isArray(agencyRows) && agencyRows[0] ? agencyRows[0] : null;
    if (!ar)
        return null;
    return {
        id: Number(ar.id),
        name: ar.name,
        cnpj: ar.cnpj,
        email: ar.email,
        phone: ar.phone ?? null,
        branchId: ar.branchId != null ? Number(ar.branchId) : null,
        branchName: ar.branchName ?? null,
        executiveId: ar.executiveId != null ? Number(ar.executiveId) : null,
        executiveName: ar.executiveName ?? null
    };
}
exports.shipmentService = {
    async listPendingOrdersForShipping(filters = {}) {
        const conditions = [`o.status = 'CONFIRMED'`];
        const params = [];
        conditions.push(`NOT EXISTS (SELECT 1 FROM shipment_orders sox WHERE sox.order_id = o.id)`);
        if (filters.agencyId != null && !Number.isNaN(filters.agencyId)) {
            conditions.push('o.agency_id = ?');
            params.push(filters.agencyId);
        }
        if (filters.dateFrom) {
            conditions.push('DATE(o.created_at) >= ?');
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            conditions.push('DATE(o.created_at) <= ?');
            params.push(filters.dateTo);
        }
        if (filters.branchId != null && !Number.isNaN(filters.branchId)) {
            conditions.push('a.branch_id = ?');
            params.push(filters.branchId);
        }
        if (filters.executiveId != null && !Number.isNaN(filters.executiveId)) {
            conditions.push('a.executive_id = ?');
            params.push(filters.executiveId);
        }
        const sql = `
            SELECT
                o.id,
                o.agency_id as agencyId,
                o.total_points as totalPoints,
                o.status,
                o.created_at as createdAt,
                o.updated_at as updatedAt,
                a.name as agencyName,
                a.branch_id as branchId,
                b.name as branchName,
                a.executive_id as executiveId,
                e.name as executiveName,
                COALESCE(GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, 'x)') ORDER BY oi.id SEPARATOR ', '), '') as productsSummary
            FROM orders o
            INNER JOIN agencies a ON o.agency_id = a.id
            LEFT JOIN branches b ON a.branch_id = b.id
            LEFT JOIN executives e ON a.executive_id = e.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE ${conditions.join(' AND ')}
            GROUP BY o.id, o.agency_id, o.total_points, o.status, o.created_at, o.updated_at,
                     a.name, a.branch_id, b.name, a.executive_id, e.name
            ORDER BY o.created_at ASC
        `;
        const rows = await (0, db_1.query)(sql, params);
        if (!Array.isArray(rows))
            return [];
        return rows.map((r) => ({
            id: Number(r.id),
            agencyId: Number(r.agencyId),
            totalPoints: Number(r.totalPoints),
            status: 'CONFIRMED',
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            agencyName: r.agencyName,
            branchId: r.branchId != null ? Number(r.branchId) : null,
            branchName: r.branchName ?? null,
            executiveId: r.executiveId != null ? Number(r.executiveId) : null,
            executiveName: r.executiveName ?? null,
            productsSummary: r.productsSummary || ''
        }));
    },
    /**
     * Pedidos já enviados em alguma remessa (shipment_orders.enviado_at preenchido),
     * retornando também o status atual da remessa para permitir filtro.
     */
    async listProcessedOrdersForAdmin(filters = {}) {
        const conditions = [`so.enviado_at IS NOT NULL`];
        const params = [];
        if (filters.status) {
            conditions.push(`s.status = ?`);
            params.push(filters.status);
        }
        if (filters.agencyId != null && !Number.isNaN(filters.agencyId)) {
            conditions.push(`o.agency_id = ?`);
            params.push(filters.agencyId);
        }
        const sql = `
            SELECT
                o.id,
                o.agency_id as agencyId,
                a.name as agencyName,
                o.total_points as totalPoints,
                o.status,
                o.created_at as createdAt,
                o.updated_at as updatedAt,
                s.status as shipmentStatus,
                COALESCE(
                    GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, 'x)') ORDER BY oi.id SEPARATOR ', '),
                    ''
                ) as productsSummary
            FROM shipment_orders so
            INNER JOIN orders o ON o.id = so.order_id
            INNER JOIN shipments s ON s.id = so.shipment_id
            INNER JOIN agencies a ON a.id = o.agency_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE ${conditions.join(' AND ')}
            GROUP BY
                o.id,
                o.agency_id,
                a.name,
                o.total_points,
                o.status,
                o.created_at,
                o.updated_at,
                s.status
            ORDER BY o.created_at DESC
        `;
        const rows = await (0, db_1.query)(sql, params);
        if (!Array.isArray(rows))
            return [];
        return rows.map((r) => ({
            id: Number(r.id),
            agencyId: Number(r.agencyId),
            agencyName: r.agencyName,
            totalPoints: Number(r.totalPoints),
            status: String(r.status),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            productsSummary: r.productsSummary || '',
            shipmentStatus: r.shipmentStatus
        }));
    },
    async createFromOrders(data) {
        const orderIds = [...new Set(data.orderIds)].filter((id) => id > 0);
        if (orderIds.length === 0) {
            throw new Error('Selecione ao menos um pedido.');
        }
        const method = (data.shippingMethod || 'CORREIOS').trim() || 'CORREIOS';
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            const placeholders = orderIds.map(() => '?').join(',');
            const [orderRows] = await connection.execute(`SELECT id, agency_id as agencyId, status FROM orders WHERE id IN (${placeholders}) FOR UPDATE`, orderIds);
            const orders = Array.isArray(orderRows) ? orderRows : [];
            if (orders.length !== orderIds.length) {
                throw new Error('Um ou mais pedidos não foram encontrados.');
            }
            for (const o of orders) {
                if (o.status !== 'CONFIRMED') {
                    throw new Error(`Pedido #${o.id} não está confirmado; só pedidos CONFIRMED podem entrar em remessa.`);
                }
            }
            const agencyIds = [...new Set(orders.map((o) => Number(o.agencyId)))];
            if (agencyIds.length !== 1) {
                throw new Error('Todos os pedidos devem ser da mesma agência.');
            }
            const agencyId = agencyIds[0];
            const [assigned] = await connection.execute(`SELECT order_id as orderId FROM shipment_orders WHERE order_id IN (${placeholders})`, orderIds);
            if (Array.isArray(assigned) && assigned.length > 0) {
                const taken = assigned.map((x) => x.orderId).join(', ');
                throw new Error(`Pedido(s) já vinculado(s) a remessa: ${taken}`);
            }
            const [insShip] = await connection.execute(`INSERT INTO shipments (agency_id, status, shipping_method, created_at, updated_at)
                 VALUES (?, 'PENDING', ?, NOW(), NOW())`, [agencyId, method]);
            const shipmentId = insShip.insertId;
            for (const oid of orderIds) {
                await connection.execute('INSERT INTO shipment_orders (shipment_id, order_id) VALUES (?, ?)', [shipmentId, oid]);
            }
            await connection.commit();
            return shipmentId;
        }
        catch (e) {
            await connection.rollback();
            throw e;
        }
        finally {
            connection.release();
        }
    },
    /**
     * Cria uma remessa por agência a partir dos pedidos informados (transação única).
     * Pedidos da mesma agência entram na mesma remessa; agências diferentes geram remessas separadas.
     */
    async createBatchFromOrders(data) {
        const orderIds = [...new Set(data.orderIds)].filter((id) => id > 0);
        if (orderIds.length === 0) {
            throw new Error('Selecione ao menos um pedido.');
        }
        const method = (data.shippingMethod || 'CORREIOS').trim() || 'CORREIOS';
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            const placeholders = orderIds.map(() => '?').join(',');
            const [orderRows] = await connection.execute(`SELECT id, agency_id as agencyId, status FROM orders WHERE id IN (${placeholders}) FOR UPDATE`, orderIds);
            const orders = Array.isArray(orderRows) ? orderRows : [];
            if (orders.length !== orderIds.length) {
                throw new Error('Um ou mais pedidos não foram encontrados.');
            }
            for (const o of orders) {
                if (o.status !== 'CONFIRMED') {
                    throw new Error(`Pedido #${o.id} não está confirmado; só pedidos CONFIRMED podem entrar em remessa.`);
                }
            }
            const [assigned] = await connection.execute(`SELECT order_id as orderId FROM shipment_orders WHERE order_id IN (${placeholders})`, orderIds);
            if (Array.isArray(assigned) && assigned.length > 0) {
                const taken = assigned.map((x) => x.orderId).join(', ');
                throw new Error(`Pedido(s) já vinculado(s) a remessa: ${taken}`);
            }
            const byAgency = new Map();
            for (const o of orders) {
                const aid = Number(o.agencyId);
                const oid = Number(o.id);
                if (!byAgency.has(aid)) {
                    byAgency.set(aid, []);
                }
                byAgency.get(aid).push(oid);
            }
            const results = [];
            for (const [agencyId, idsForAgency] of byAgency) {
                const [insShip] = await connection.execute(`INSERT INTO shipments (agency_id, status, shipping_method, created_at, updated_at)
                     VALUES (?, 'PENDING', ?, NOW(), NOW())`, [agencyId, method]);
                const shipmentId = insShip.insertId;
                for (const oid of idsForAgency) {
                    await connection.execute('INSERT INTO shipment_orders (shipment_id, order_id) VALUES (?, ?)', [shipmentId, oid]);
                }
                results.push({
                    id: shipmentId,
                    agencyId,
                    orderIds: idsForAgency
                });
            }
            await connection.commit();
            return results;
        }
        catch (e) {
            await connection.rollback();
            throw e;
        }
        finally {
            connection.release();
        }
    },
    async list(filters = {}) {
        const conditions = ['1=1'];
        const params = [];
        if (filters.status) {
            conditions.push('s.status = ?');
            params.push(filters.status);
        }
        if (filters.agencyId != null && !Number.isNaN(filters.agencyId)) {
            conditions.push('s.agency_id = ?');
            params.push(filters.agencyId);
        }
        const sql = `
            SELECT
                s.id,
                s.agency_id as agencyId,
                s.status,
                s.shipping_method as shippingMethod,
                s.tracking_code as trackingCode,
                s.label_url as labelUrl,
                s.posted_at as postedAt,
                s.created_at as createdAt,
                s.updated_at as updatedAt,
                a.name as agencyName,
                (SELECT COUNT(*) FROM shipment_orders so2 WHERE so2.shipment_id = s.id) as orderCount
            FROM shipments s
            INNER JOIN agencies a ON s.agency_id = a.id
            WHERE ${conditions.join(' AND ')}
            ORDER BY s.created_at DESC
        `;
        const rows = await (0, db_1.query)(sql, params);
        if (!Array.isArray(rows))
            return [];
        return rows.map((r) => ({
            ...mapShipmentRow(r),
            agencyName: r.agencyName,
            orderCount: Number(r.orderCount) || 0
        }));
    },
    async findById(id) {
        const rows = await (0, db_1.query)(`SELECT id, agency_id as agencyId, status, shipping_method as shippingMethod,
                    tracking_code as trackingCode, label_url as labelUrl, posted_at as postedAt,
                    created_at as createdAt, updated_at as updatedAt
             FROM shipments WHERE id = ?`, [id]);
        if (!Array.isArray(rows) || rows.length === 0)
            return null;
        return mapShipmentRow(rows[0]);
    },
    async getDetail(id) {
        const shipment = await this.findById(id);
        if (!shipment)
            return null;
        const agencyRows = await (0, db_1.query)(`SELECT a.id, a.cnpj, a.name, a.email, a.phone, a.branch_id as branchId, b.name as branchName,
                    a.executive_id as executiveId, e.name as executiveName
             FROM agencies a
             LEFT JOIN branches b ON a.branch_id = b.id
             LEFT JOIN executives e ON a.executive_id = e.id
             WHERE a.id = ?`, [shipment.agencyId]);
        const ar = Array.isArray(agencyRows) && agencyRows[0] ? agencyRows[0] : null;
        if (!ar)
            return null;
        /**
         * Fonte de verdade: uma linha em shipment_orders = um pedido na remessa.
         * Ordem explícita por order_id; nunca omitir por falha em findById (antes dava `continue` e sumiam pedidos).
         */
        const orderIdRows = normalizeMysqlRows(await (0, db_1.query)(`SELECT order_id as orderId FROM shipment_orders WHERE shipment_id = ? ORDER BY order_id ASC`, [id]));
        const orderIds = orderIdRows.map((r) => Number(r.orderId)).filter((n) => Number.isFinite(n) && n > 0);
        const orders = [];
        const aggMap = new Map();
        for (const oid of orderIds) {
            const ord = await orderService_1.orderService.findById(oid);
            const items = await orderService_1.orderService.findItemsByOrderId(oid);
            if (!ord) {
                orders.push({
                    id: oid,
                    totalPoints: 0,
                    createdAt: new Date(0),
                    items
                });
            }
            else {
                orders.push({
                    id: ord.id,
                    totalPoints: ord.totalPoints,
                    createdAt: ord.createdAt,
                    items
                });
            }
            for (const it of items) {
                const key = `${it.productId}|${it.productVariantId ?? 'x'}|${it.pointsPerUnit}`;
                const prev = aggMap.get(key);
                if (prev) {
                    prev.quantity += it.quantity;
                }
                else {
                    aggMap.set(key, {
                        productId: it.productId,
                        productName: it.productName,
                        model: it.model,
                        size: it.size,
                        quantity: it.quantity,
                        pointsPerUnit: it.pointsPerUnit
                    });
                }
            }
        }
        const deliveryAddress = await addressService_1.addressService.findByAgencyId(shipment.agencyId);
        return {
            shipment,
            agency: {
                id: Number(ar.id),
                name: ar.name,
                cnpj: ar.cnpj,
                email: ar.email,
                phone: ar.phone ?? null,
                branchId: ar.branchId != null ? Number(ar.branchId) : null,
                branchName: ar.branchName ?? null,
                executiveId: ar.executiveId != null ? Number(ar.executiveId) : null,
                executiveName: ar.executiveName ?? null
            },
            deliveryAddress,
            orders,
            aggregatedItems: [...aggMap.values()]
        };
    },
    /**
     * Fila: pedidos de remessas PENDING ainda não enviados (enviado_at IS NULL).
     * processado = processed_at preenchido (Próximo); enviado = após fechar o lote na preparação.
     */
    async getPreparationQueue() {
        const rows = normalizeMysqlRows(await (0, db_1.query)(`SELECT s.id as shipmentId, s.agency_id as agencyId, so.order_id as orderId,
                        so.processed_at as processedAt
                 FROM shipments s
                 INNER JOIN shipment_orders so ON so.shipment_id = s.id
                 WHERE s.status = 'PENDING' AND so.enviado_at IS NULL
                 ORDER BY s.id ASC, so.order_id ASC`, []));
        const agencyCache = new Map();
        const addressCache = new Map();
        const entries = [];
        for (const row of rows) {
            const agencyId = Number(row.agencyId);
            const shipmentId = Number(row.shipmentId);
            const oid = Number(row.orderId);
            if (!Number.isFinite(agencyId) || !Number.isFinite(shipmentId) || !Number.isFinite(oid))
                continue;
            if (!agencyCache.has(agencyId)) {
                const ag = await loadAgencyForPreparation(agencyId);
                if (!ag)
                    continue;
                agencyCache.set(agencyId, ag);
                addressCache.set(agencyId, await addressService_1.addressService.findByAgencyId(agencyId));
            }
            const agency = agencyCache.get(agencyId);
            const deliveryAddress = addressCache.get(agencyId);
            const processed = row.processedAt != null;
            const ord = await orderService_1.orderService.findById(oid);
            const items = await orderService_1.orderService.findItemsByOrderId(oid);
            if (!ord) {
                entries.push({
                    shipmentId,
                    processed,
                    order: {
                        id: oid,
                        totalPoints: 0,
                        createdAt: new Date(0),
                        items
                    },
                    agency,
                    deliveryAddress
                });
            }
            else {
                entries.push({
                    shipmentId,
                    processed,
                    order: {
                        id: ord.id,
                        totalPoints: ord.totalPoints,
                        createdAt: ord.createdAt,
                        items
                    },
                    agency,
                    deliveryAddress
                });
            }
        }
        return entries;
    },
    /** Marca pedido como processado (conferido); ainda não enviado até fechar lote com CSV. */
    async markOrderProcessedInPreparation(orderId) {
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [lockRows] = await connection.execute(`SELECT shipment_id as shipmentId FROM shipment_orders WHERE order_id = ? AND enviado_at IS NULL FOR UPDATE`, [orderId]);
            const found = normalizeMysqlRows(lockRows);
            if (found.length === 0) {
                await connection.rollback();
                throw new Error('Pedido não está na fila de preparação ou já foi enviado em um lote.');
            }
            const shipmentId = Number(found[0].shipmentId);
            const [shipRows] = await connection.execute(`SELECT status FROM shipments WHERE id = ? FOR UPDATE`, [shipmentId]);
            const shipList = normalizeMysqlRows(shipRows);
            if (shipList.length === 0 || shipList[0].status !== 'PENDING') {
                await connection.rollback();
                throw new Error('Remessa não está pendente de preparação.');
            }
            await connection.execute(`UPDATE shipment_orders SET processed_at = IFNULL(processed_at, NOW()) WHERE order_id = ? AND enviado_at IS NULL`, [orderId]);
            await connection.commit();
            return { shipmentId };
        }
        catch (e) {
            await connection.rollback();
            throw e;
        }
        finally {
            connection.release();
        }
    },
    /**
     * Fecha um lote: grava batch, marca pedidos como enviados (enviado_at).
     * Remessa vai a READY_TO_POST só quando todos os pedidos da remessa tiverem enviado_at.
     */
    async finalizePreparationBatch(orderIds) {
        const unique = [...new Set(orderIds)].filter((id) => id > 0);
        if (unique.length === 0) {
            throw new Error('Informe ao menos um pedido para o lote.');
        }
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            const placeholders = unique.map(() => '?').join(',');
            const [lockRows] = await connection.execute(`SELECT so.order_id as orderId, so.shipment_id as shipmentId, so.processed_at as processedAt, so.enviado_at as enviadoAt
                 FROM shipment_orders so
                 INNER JOIN shipments s ON s.id = so.shipment_id
                 WHERE so.order_id IN (${placeholders}) FOR UPDATE`, unique);
            const found = normalizeMysqlRows(lockRows);
            if (found.length !== unique.length) {
                await connection.rollback();
                throw new Error('Um ou mais pedidos não foram encontrados em remessa.');
            }
            for (const r of found) {
                if (!r.processedAt) {
                    await connection.rollback();
                    throw new Error(`Pedido #${r.orderId} precisa estar processado (use Próximo ou inclua na conferência) antes de fechar o lote.`);
                }
                if (r.enviadoAt) {
                    await connection.rollback();
                    throw new Error(`Pedido #${r.orderId} já foi enviado em outro lote.`);
                }
            }
            for (const sid of new Set(found.map((f) => f.shipmentId))) {
                const [sr] = await connection.execute(`SELECT status FROM shipments WHERE id = ? FOR UPDATE`, [sid]);
                const sl = normalizeMysqlRows(sr);
                if (sl.length === 0 || sl[0].status !== 'PENDING') {
                    await connection.rollback();
                    throw new Error(`Remessa #${sid} não está pendente.`);
                }
            }
            const [insBatch] = await connection.execute(`INSERT INTO preparation_batches (created_at) VALUES (NOW())`);
            const batchId = Number(insBatch.insertId);
            const [updResult] = await connection.execute(`UPDATE shipment_orders
                 SET enviado_at = NOW(), preparation_batch_id = ?
                 WHERE order_id IN (${placeholders}) AND processed_at IS NOT NULL AND enviado_at IS NULL`, [batchId, ...unique]);
            const affected = Number(updResult.affectedRows ?? 0);
            if (affected !== unique.length) {
                await connection.rollback();
                throw new Error('Não foi possível concluir o lote para todos os pedidos informados.');
            }
            const shipmentIds = [...new Set(found.map((f) => f.shipmentId))];
            for (const sid of shipmentIds) {
                const [pendingRows] = await connection.execute(`SELECT COUNT(*) as c FROM shipment_orders WHERE shipment_id = ? AND enviado_at IS NULL`, [sid]);
                const remaining = Number(normalizeMysqlRows(pendingRows)[0]?.c ?? 0);
                if (remaining === 0) {
                    await connection.execute(`UPDATE shipments SET status = 'READY_TO_POST', updated_at = NOW() WHERE id = ? AND status = 'PENDING'`, [sid]);
                }
            }
            await connection.commit();
            return { batchId, orderIds: unique };
        }
        catch (e) {
            await connection.rollback();
            throw e;
        }
        finally {
            connection.release();
        }
    },
    async listPreparationBatches() {
        const rows = normalizeMysqlRows(await (0, db_1.query)(`SELECT b.id, b.created_at as createdAt,
                        so.order_id as orderId, so.shipment_id as shipmentId,
                        a.name as agencyName
                 FROM preparation_batches b
                 INNER JOIN shipment_orders so ON so.preparation_batch_id = b.id
                 INNER JOIN shipments s ON s.id = so.shipment_id
                 INNER JOIN agencies a ON a.id = s.agency_id
                 ORDER BY b.id DESC, so.order_id ASC`, []));
        const byBatch = new Map();
        for (const r of rows) {
            const id = Number(r.id);
            if (!byBatch.has(id)) {
                byBatch.set(id, {
                    id,
                    createdAt: r.createdAt,
                    displayName: `Lote #${id}`,
                    orders: []
                });
            }
            byBatch.get(id).orders.push({
                orderId: Number(r.orderId),
                shipmentId: Number(r.shipmentId),
                agencyName: r.agencyName
            });
        }
        return [...byBatch.values()];
    },
    async getPreparationBatchDetail(batchId) {
        const batchRows = normalizeMysqlRows(await (0, db_1.query)(`SELECT id, created_at as createdAt FROM preparation_batches WHERE id = ?`, [batchId]));
        if (batchRows.length === 0)
            return null;
        const b = batchRows[0];
        const id = Number(b.id);
        const orderRows = normalizeMysqlRows(await (0, db_1.query)(`SELECT so.order_id as orderId, so.shipment_id as shipmentId, s.agency_id as agencyId
                 FROM shipment_orders so
                 INNER JOIN shipments s ON s.id = so.shipment_id
                 WHERE so.preparation_batch_id = ?
                 ORDER BY s.agency_id ASC, so.order_id ASC`, [id]));
        const agencyMap = new Map();
        for (const row of orderRows) {
            const aid = Number(row.agencyId);
            const oid = Number(row.orderId);
            const sid = Number(row.shipmentId);
            if (!agencyMap.has(aid)) {
                const ag = await loadAgencyForPreparation(aid);
                if (!ag)
                    continue;
                agencyMap.set(aid, { ...ag, orders: [] });
            }
            const ord = await orderService_1.orderService.findById(oid);
            const items = await orderService_1.orderService.findItemsByOrderId(oid);
            agencyMap.get(aid).orders.push({
                orderId: oid,
                shipmentId: sid,
                totalPoints: ord ? ord.totalPoints : 0,
                createdAt: ord ? ord.createdAt : new Date(0),
                items
            });
        }
        const agencies = [...agencyMap.values()].sort((x, y) => x.name.localeCompare(y.name, 'pt-BR'));
        return {
            id,
            createdAt: b.createdAt,
            displayName: `Lote #${id}`,
            agencies
        };
    },
    async buildPreparationBatchCsv(batchId) {
        const detail = await this.getPreparationBatchDetail(batchId);
        if (!detail) {
            throw new Error('Lote não encontrado.');
        }
        const header = [
            'Remessa',
            'Agência',
            'CNPJ',
            'Filial',
            'Executivo',
            'Pedido',
            'Total pts pedido',
            'Data pedido',
            'Endereço entrega',
            'Produto',
            'Modelo',
            'Tamanho',
            'Quantidade',
            'Pts/unidade'
        ];
        const lines = [header.map(csvEscapeCell).join(';')];
        for (const ag of detail.agencies) {
            const addr = await addressService_1.addressService.findByAgencyId(ag.id);
            const delivery = csvDeliveryLine(addr);
            for (const ord of ag.orders) {
                const base = [
                    ord.shipmentId,
                    ag.name,
                    ag.cnpj,
                    ag.branchName ?? '',
                    ag.executiveName ?? '',
                    ord.orderId,
                    ord.totalPoints,
                    new Date(ord.createdAt).toLocaleString('pt-BR'),
                    delivery
                ];
                for (const it of ord.items) {
                    lines.push([
                        ...base,
                        it.productName,
                        csvFormatModel(it.model),
                        it.size ?? '',
                        it.quantity,
                        it.pointsPerUnit
                    ]
                        .map(csvEscapeCell)
                        .join(';'));
                }
            }
        }
        return '\uFEFF' + lines.join('\n');
    },
    async update(id, data) {
        const current = await this.findById(id);
        if (!current)
            return null;
        const nextStatus = data.status ?? current.status;
        const nextTracking = data.trackingCode !== undefined ? data.trackingCode : current.trackingCode;
        const nextMethod = data.shippingMethod ?? current.shippingMethod;
        let nextPostedAt = current.postedAt;
        if (data.postedAt !== undefined) {
            nextPostedAt = data.postedAt ? new Date(data.postedAt) : null;
        }
        else if (nextStatus === 'POSTED' && !current.postedAt) {
            nextPostedAt = new Date();
        }
        await (0, db_1.query)(`UPDATE shipments SET
                status = ?,
                tracking_code = ?,
                shipping_method = ?,
                posted_at = ?,
                updated_at = NOW()
             WHERE id = ?`, [nextStatus, nextTracking, nextMethod, nextPostedAt, id]);
        return this.findById(id);
    }
};
