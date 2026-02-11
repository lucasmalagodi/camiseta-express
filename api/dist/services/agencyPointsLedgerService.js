"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agencyPointsLedgerService = void 0;
const db_1 = require("../config/db");
exports.agencyPointsLedgerService = {
    // Inserir entrada no ledger (única operação permitida - nunca update ou delete)
    async createEntry(agencyId, sourceType, sourceId, points, description) {
        const result = await (0, db_1.query)('INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [agencyId, sourceType, sourceId, points, description || null]);
        return result.insertId;
    },
    async findByAgencyId(agencyId) {
        const results = await (0, db_1.query)('SELECT id, agency_id as agencyId, source_type as sourceType, source_id as sourceId, points, description, created_at as createdAt FROM agency_points_ledger WHERE agency_id = ? ORDER BY created_at DESC', [agencyId]);
        return Array.isArray(results) ? results : [];
    },
    async getBalance(agencyId) {
        const results = await (0, db_1.query)('SELECT COALESCE(SUM(points), 0) as balance FROM agency_points_ledger WHERE agency_id = ?', [agencyId]);
        if (Array.isArray(results) && results.length > 0) {
            return Number(results[0].balance) || 0;
        }
        return 0;
    },
    async getPointsSummary(agencyId) {
        // Query otimizada que retorna balance e última atualização em uma única consulta
        const results = await (0, db_1.query)(`SELECT 
                COALESCE(SUM(points), 0) as currentPoints,
                MAX(created_at) as lastUpdatedAt
            FROM agency_points_ledger 
            WHERE agency_id = ?`, [agencyId]);
        if (Array.isArray(results) && results.length > 0) {
            const result = results[0];
            return {
                currentPoints: Number(result.currentPoints) || 0,
                lastUpdatedAt: result.lastUpdatedAt ? new Date(result.lastUpdatedAt).toISOString() : null
            };
        }
        return {
            currentPoints: 0,
            lastUpdatedAt: null
        };
    }
};
