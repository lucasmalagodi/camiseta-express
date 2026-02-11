import { query } from '../config/db';
import { AgencyPointsLedger } from '../types';

export const agencyPointsLedgerService = {
    // Inserir entrada no ledger (única operação permitida - nunca update ou delete)
    async createEntry(agencyId: number, sourceType: 'IMPORT' | 'REDEEM', sourceId: number, points: number, description?: string): Promise<number> {
        const result = await query(
            'INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [agencyId, sourceType, sourceId, points, description || null]
        ) as any;

        return result.insertId;
    },

    async findByAgencyId(agencyId: number): Promise<AgencyPointsLedger[]> {
        const results = await query(
            'SELECT id, agency_id as agencyId, source_type as sourceType, source_id as sourceId, points, description, created_at as createdAt FROM agency_points_ledger WHERE agency_id = ? ORDER BY created_at DESC',
            [agencyId]
        ) as AgencyPointsLedger[];

        return Array.isArray(results) ? results : [];
    },

    async getBalance(agencyId: number): Promise<number> {
        const results = await query(
            'SELECT COALESCE(SUM(points), 0) as balance FROM agency_points_ledger WHERE agency_id = ?',
            [agencyId]
        ) as any[];

        if (Array.isArray(results) && results.length > 0) {
            return Number(results[0].balance) || 0;
        }
        return 0;
    },

    async getPointsSummary(agencyId: number): Promise<{ currentPoints: number; lastUpdatedAt: string | null }> {
        // Query otimizada que retorna balance e última atualização em uma única consulta
        const results = await query(
            `SELECT 
                COALESCE(SUM(points), 0) as currentPoints,
                MAX(created_at) as lastUpdatedAt
            FROM agency_points_ledger 
            WHERE agency_id = ?`,
            [agencyId]
        ) as any[];

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
