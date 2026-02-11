"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const db_1 = require("../config/db");
// Cache simples em memória com TTL de 45 segundos
const CACHE_TTL = 45 * 1000; // 45 segundos
const cache = new Map();
function getCached(key) {
    const entry = cache.get(key);
    if (!entry)
        return null;
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}
function setCache(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}
function clearCache() {
    cache.clear();
}
exports.dashboardService = {
    // Orders Summary
    async getOrdersSummary() {
        const cacheKey = 'orders-summary';
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        const [summary] = await (0, db_1.query)(`
            SELECT 
                COUNT(*) as totalOrders,
                COALESCE(SUM(total_points), 0) as totalPointsSpent,
                COUNT(CASE WHEN MONTH(created_at) = MONTH(CURRENT_DATE()) 
                           AND YEAR(created_at) = YEAR(CURRENT_DATE()) 
                    THEN 1 END) as ordersThisMonth
            FROM orders
            WHERE status != 'CANCELED'
        `);
        const result = {
            totalOrders: Number(summary.totalOrders) || 0,
            totalPointsSpent: Number(summary.totalPointsSpent) || 0,
            ordersThisMonth: Number(summary.ordersThisMonth) || 0
        };
        setCache(cacheKey, result);
        return result;
    },
    // Top Agency by Points
    async getTopAgencyByPoints() {
        const cacheKey = 'top-agency-points';
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        const results = await (0, db_1.query)(`
            SELECT 
                a.id,
                a.name as agencyName,
                a.cnpj,
                COALESCE(SUM(api.points), 0) as totalPoints,
                (
                    SELECT api2.branch 
                    FROM agency_points_import_items api2
                    INNER JOIN agency_points_imports ap ON api2.import_id = ap.id
                    WHERE api2.cnpj = a.cnpj 
                      AND api2.branch IS NOT NULL 
                      AND api2.branch != ''
                    ORDER BY ap.uploaded_at DESC
                    LIMIT 1
                ) as branch,
                (
                    SELECT api2.executive_name 
                    FROM agency_points_import_items api2
                    INNER JOIN agency_points_imports ap ON api2.import_id = ap.id
                    WHERE api2.cnpj = a.cnpj 
                      AND api2.executive_name IS NOT NULL 
                      AND api2.executive_name != ''
                    ORDER BY ap.uploaded_at DESC
                    LIMIT 1
                ) as executive
            FROM agencies a
            INNER JOIN agency_points_import_items api ON api.cnpj = a.cnpj
            WHERE a.active = true
              AND api.points IS NOT NULL
            GROUP BY a.id, a.name, a.cnpj
            HAVING totalPoints > 0
            ORDER BY totalPoints DESC
            LIMIT 1
        `);
        const result = Array.isArray(results) && results.length > 0 ? results[0] : null;
        const data = result ? {
            agencyId: result.id,
            agencyName: result.agencyName || 'N/A',
            cnpj: result.cnpj,
            totalPoints: Number(result.totalPoints) || 0,
            branch: result.branch || 'N/A',
            executive: result.executive || 'N/A'
        } : null;
        setCache(cacheKey, data);
        return data;
    },
    // Top Agency by Orders
    async getTopAgencyByOrders() {
        const cacheKey = 'top-agency-orders';
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        const results = await (0, db_1.query)(`
            SELECT 
                a.id,
                a.name as agencyName,
                a.cnpj,
                COUNT(o.id) as ordersCount,
                (
                    SELECT api.branch 
                    FROM agency_points_import_items api
                    INNER JOIN agency_points_imports ap ON api.import_id = ap.id
                    WHERE api.cnpj = a.cnpj 
                      AND api.branch IS NOT NULL 
                      AND api.branch != ''
                    ORDER BY ap.uploaded_at DESC
                    LIMIT 1
                ) as branch
            FROM agencies a
            INNER JOIN orders o ON a.id = o.agency_id
            WHERE a.active = true AND o.status != 'CANCELED'
            GROUP BY a.id, a.name, a.cnpj
            HAVING ordersCount > 0
            ORDER BY ordersCount DESC
            LIMIT 1
        `);
        const result = Array.isArray(results) && results.length > 0 ? results[0] : null;
        const data = result ? {
            agencyId: result.id,
            agencyName: result.agencyName || 'N/A',
            cnpj: result.cnpj,
            ordersCount: Number(result.ordersCount) || 0,
            branch: result.branch || 'N/A'
        } : null;
        setCache(cacheKey, data);
        return data;
    },
    // Agency Orders (drill-down)
    async getAgencyOrders(agencyId) {
        const cacheKey = `agency-orders-${agencyId}`;
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        const results = await (0, db_1.query)(`
            SELECT 
                o.id,
                o.total_points as totalPoints,
                o.status,
                o.created_at as createdAt,
                o.updated_at as updatedAt,
                COUNT(oi.id) as itemsCount
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.agency_id = ? AND o.status != 'CANCELED'
            GROUP BY o.id, o.total_points, o.status, o.created_at, o.updated_at
            ORDER BY o.created_at DESC
            LIMIT 50
        `, [agencyId]);
        const data = results.map((row) => ({
            id: row.id,
            totalPoints: Number(row.totalPoints) || 0,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            itemsCount: Number(row.itemsCount) || 0
        }));
        setCache(cacheKey, data);
        return data;
    },
    // Top 10 Suppliers
    async getTopSuppliers() {
        const cacheKey = 'top-suppliers';
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        const results = await (0, db_1.query)(`
            SELECT 
                supplier,
                COUNT(*) as salesCount
            FROM agency_points_import_items
            WHERE supplier IS NOT NULL AND supplier != ''
            GROUP BY supplier
            ORDER BY salesCount DESC
            LIMIT 10
        `);
        const data = results.map((row) => ({
            supplierName: row.supplier || 'N/A',
            salesCount: Number(row.salesCount) || 0
        }));
        setCache(cacheKey, data);
        return data;
    },
    // Products by Branch
    async getProductsByBranch() {
        const cacheKey = 'products-by-branch';
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        const results = await (0, db_1.query)(`
            SELECT 
                api.branch,
                p.id as productId,
                p.name as productName,
                COUNT(DISTINCT oi.order_id) as ordersCount,
                SUM(oi.quantity) as totalQuantity
            FROM agency_points_import_items api
            INNER JOIN orders o ON JSON_CONTAINS(
                (SELECT JSON_ARRAYAGG(api2.cnpj) 
                 FROM agency_points_import_items api2 
                 WHERE api2.branch = api.branch 
                 LIMIT 1), 
                JSON_QUOTE(o.agency_id)
            ) = 0
            INNER JOIN order_items oi ON o.id = oi.order_id
            INNER JOIN products p ON oi.product_id = p.id
            WHERE api.branch IS NOT NULL 
              AND api.branch != '' 
              AND o.status != 'CANCELED'
            GROUP BY api.branch, p.id, p.name
            ORDER BY api.branch, ordersCount DESC
        `);
        // Reorganizar por branch
        const branchMap = new Map();
        for (const row of results) {
            const branch = row.branch || 'N/A';
            if (!branchMap.has(branch)) {
                branchMap.set(branch, []);
            }
            branchMap.get(branch).push({
                productId: row.productId,
                productName: row.productName || 'N/A',
                ordersCount: Number(row.ordersCount) || 0,
                totalQuantity: Number(row.totalQuantity) || 0
            });
        }
        const data = Array.from(branchMap.entries()).map(([branch, products]) => ({
            branch,
            products
        }));
        setCache(cacheKey, data);
        return data;
    },
    // Versão simplificada de Products by Branch (usando imports)
    async getProductsByBranchSimplified() {
        const cacheKey = 'products-by-branch-simplified';
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        // Buscar produtos por branch através dos imports
        const results = await (0, db_1.query)(`
            SELECT 
                api.branch,
                api.product_name as productName,
                COUNT(*) as salesCount
            FROM agency_points_import_items api
            WHERE api.branch IS NOT NULL 
              AND api.branch != ''
              AND api.product_name IS NOT NULL
              AND api.product_name != ''
            GROUP BY api.branch, api.product_name
            ORDER BY api.branch, salesCount DESC
        `);
        // Reorganizar por branch
        const branchMap = new Map();
        for (const row of results) {
            const branch = row.branch || 'N/A';
            if (!branchMap.has(branch)) {
                branchMap.set(branch, []);
            }
            branchMap.get(branch).push({
                productName: row.productName || 'N/A',
                salesCount: Number(row.salesCount) || 0
            });
        }
        const data = Array.from(branchMap.entries()).map(([branch, products]) => ({
            branch,
            products
        }));
        setCache(cacheKey, data);
        return data;
    },
    // Top 10 Agencies with Points but No Orders
    async getTopAgenciesWithoutOrders() {
        const cacheKey = 'top-agencies-without-orders';
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        const results = await (0, db_1.query)(`
            SELECT 
                a.id,
                a.name as agencyName,
                a.cnpj,
                COALESCE(SUM(api.points), 0) as totalPoints,
                (
                    SELECT api2.branch 
                    FROM agency_points_import_items api2
                    INNER JOIN agency_points_imports ap ON api2.import_id = ap.id
                    WHERE api2.cnpj = a.cnpj 
                      AND api2.branch IS NOT NULL 
                      AND api2.branch != ''
                    ORDER BY ap.uploaded_at DESC
                    LIMIT 1
                ) as branch,
                (
                    SELECT api2.executive_name 
                    FROM agency_points_import_items api2
                    INNER JOIN agency_points_imports ap ON api2.import_id = ap.id
                    WHERE api2.cnpj = a.cnpj 
                      AND api2.executive_name IS NOT NULL 
                      AND api2.executive_name != ''
                    ORDER BY ap.uploaded_at DESC
                    LIMIT 1
                ) as executive
            FROM agencies a
            INNER JOIN agency_points_import_items api ON api.cnpj = a.cnpj
            WHERE a.active = true
              AND api.points IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 
                  FROM orders o 
                  WHERE o.agency_id = a.id 
                    AND o.status != 'CANCELED'
              )
            GROUP BY a.id, a.name, a.cnpj
            HAVING totalPoints > 0
            ORDER BY totalPoints DESC
            LIMIT 10
        `);
        const data = results.map((row) => ({
            agencyId: row.id,
            agencyName: row.agencyName || 'N/A',
            cnpj: row.cnpj,
            totalPoints: Number(row.totalPoints) || 0,
            branch: row.branch || 'N/A',
            executive: row.executive || 'N/A'
        }));
        setCache(cacheKey, data);
        return data;
    },
    // Top 10 Agencies with Points but Not Registered
    async getTopAgenciesNotRegistered() {
        const cacheKey = 'top-agencies-not-registered';
        const cached = getCached(cacheKey);
        if (cached)
            return cached;
        const results = await (0, db_1.query)(`
            SELECT 
                api.cnpj,
                COALESCE(SUM(api.points), 0) as totalPoints,
                MAX(api.agency_name) as agencyName,
                (
                    SELECT api2.branch 
                    FROM agency_points_import_items api2
                    INNER JOIN agency_points_imports ap ON api2.import_id = ap.id
                    WHERE api2.cnpj = api.cnpj 
                      AND api2.branch IS NOT NULL 
                      AND api2.branch != ''
                    ORDER BY ap.uploaded_at DESC
                    LIMIT 1
                ) as branch,
                (
                    SELECT api2.executive_name 
                    FROM agency_points_import_items api2
                    INNER JOIN agency_points_imports ap ON api2.import_id = ap.id
                    WHERE api2.cnpj = api.cnpj 
                      AND api2.executive_name IS NOT NULL 
                      AND api2.executive_name != ''
                    ORDER BY ap.uploaded_at DESC
                    LIMIT 1
                ) as executive
            FROM agency_points_import_items api
            WHERE api.points IS NOT NULL
              AND api.cnpj NOT IN (SELECT cnpj FROM agencies)
            GROUP BY api.cnpj
            HAVING totalPoints > 0
            ORDER BY totalPoints DESC
            LIMIT 10
        `);
        const data = results.map((row) => ({
            cnpj: row.cnpj,
            agencyName: row.agencyName || 'N/A',
            totalPoints: Number(row.totalPoints) || 0,
            branch: row.branch || 'N/A',
            executive: row.executive || 'N/A'
        }));
        setCache(cacheKey, data);
        return data;
    },
    // Limpar cache (útil para testes ou quando dados são atualizados)
    clearCache
};
