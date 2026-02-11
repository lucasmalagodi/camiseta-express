import { query, pool } from '../config/db';
import { Agency, CreateAgencyDto, UpdateAgencyDto } from '../types';
import { addressService } from './addressService';
import crypto from 'crypto';

// Função auxiliar para normalizar CNPJ (remove formatação)
function normalizeCnpj(cnpj: string): string {
    return cnpj.replace(/[^\d]/g, '');
}

// Função auxiliar para validar formato de CPF/CNPJ
function validateCnpjFormat(cnpj: string): boolean {
    const cleanCnpj = normalizeCnpj(cnpj);
    // CPF tem 11 dígitos, CNPJ tem 14 dígitos
    return cleanCnpj.length === 11 || cleanCnpj.length === 14;
}

export const agencyService = {
    async create(data: CreateAgencyDto): Promise<number> {
        // Verificar se já existe agência com este CNPJ
        const existing = await this.findByCnpj(data.cnpj);
        if (existing) {
            throw new Error('Agency with this CNPJ already exists');
        }

        // Verificar se existe pelo menos um import item com este CNPJ
        const normalizedCnpj = normalizeCnpj(data.cnpj);
        const importItems = await query(
            `SELECT COUNT(*) as count FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
            [normalizedCnpj]
        ) as any[];

        const count = Array.isArray(importItems) && importItems.length > 0 ? Number(importItems[0].count) : 0;
        if (count === 0) {
            throw new Error('No points import found for this CNPJ. Agency cannot be created.');
        }

        // Buscar branch e executive_name mais comuns dos imports
        const branchResults = await query(
            `SELECT branch, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND branch IS NOT NULL AND branch != ''
             GROUP BY branch
             ORDER BY count DESC
             LIMIT 1`,
            [normalizedCnpj]
        ) as any[];

        const branch = Array.isArray(branchResults) && branchResults.length > 0 
            ? branchResults[0].branch 
            : null;

        const executiveResults = await query(
            `SELECT executive_name, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND executive_name IS NOT NULL AND executive_name != ''
             GROUP BY executive_name
             ORDER BY count DESC
             LIMIT 1`,
            [normalizedCnpj]
        ) as any[];

        const executiveName = Array.isArray(executiveResults) && executiveResults.length > 0 
            ? executiveResults[0].executive_name 
            : null;

        // Criar agência
        const result = await query(
            'INSERT INTO agencies (cnpj, name, email, phone, branch, executive_name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, false, NOW(), NOW())',
            [normalizedCnpj, data.name, data.email, data.phone || null, branch, executiveName]
        ) as any;

        const agencyId = result.insertId;

        // Criar endereço
        await addressService.create(agencyId, data.address);

        // Após criar agência, criar ledger entries para todos os import items deste CNPJ
        const importItemsForCnpj = await query(
            `SELECT id, import_id, points FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
            [normalizedCnpj]
        ) as any[];

        if (Array.isArray(importItemsForCnpj) && importItemsForCnpj.length > 0) {
            for (const item of importItemsForCnpj) {
                await query(
                    'INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                    [
                        agencyId,
                        'IMPORT',
                        item.import_id,
                        item.points,
                        `Import from ${item.import_id}`
                    ]
                );
            }
        }

        return agencyId;
    },

    async update(id: number, data: UpdateAgencyDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }

        if (data.email !== undefined) {
            updates.push('email = ?');
            values.push(data.email);
        }

        if (data.phone !== undefined) {
            updates.push('phone = ?');
            values.push(data.phone);
        }

        if (data.active !== undefined) {
            // Validar ativação: só pode ativar se tiver pontos no ledger
            if (data.active === true) {
                const balance = await this.getBalance(id);
                if (balance <= 0) {
                    throw new Error('Cannot activate agency: no points available');
                }
            }
            updates.push('active = ?');
            values.push(data.active);
        }

        if (updates.length === 0) {
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(id);

        await query(
            `UPDATE agencies SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
    },

    async softDelete(id: number): Promise<void> {
        await query(
            'UPDATE agencies SET active = false, updated_at = NOW() WHERE id = ?',
            [id]
        );
    },

    async findById(id: number): Promise<Agency | null> {
        const results = await query(
            'SELECT id, cnpj, name, email, phone, branch, executive_name, active, created_at as createdAt, updated_at as updatedAt FROM agencies WHERE id = ?',
            [id]
        ) as Agency[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findByCnpj(cnpj: string): Promise<Agency | null> {
        const results = await query(
            'SELECT id, cnpj, name, email, phone, branch, executive_name, active, created_at as createdAt, updated_at as updatedAt FROM agencies WHERE cnpj = ?',
            [cnpj]
        ) as Agency[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findByEmail(email: string): Promise<{ id: number; email: string; password: string; name: string; active: boolean } | null> {
        const results = await query(
            'SELECT id, email, password, name, active FROM agencies WHERE email = ?',
            [email.trim().toLowerCase()]
        ) as { id: number; email: string; password: string; name: string; active: boolean }[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async findAll(active?: boolean): Promise<Agency[]> {
        let sql = 'SELECT id, cnpj, name, email, phone, branch, executive_name, active, created_at as createdAt, updated_at as updatedAt FROM agencies';
        const values: any[] = [];

        if (active !== undefined) {
            sql += ' WHERE active = ?';
            values.push(active);
        }

        sql += ' ORDER BY created_at DESC';

        const results = await query(sql, values.length > 0 ? values : undefined) as Agency[];
        return Array.isArray(results) ? results : [];
    },

    // Calcular balance a partir do ledger (fonte única da verdade)
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

    // Buscar filial mais comum dos imports desta agência
    async getMostCommonBranch(agencyId: number): Promise<string | null> {
        // Buscar CNPJ da agência
        const agency = await this.findById(agencyId);
        if (!agency) {
            return null;
        }

        // Normalizar CNPJ para busca
        const normalizedCnpj = normalizeCnpj(agency.cnpj);

        // Buscar filial mais comum nos imports desta agência
        const results = await query(
            `SELECT branch, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND branch IS NOT NULL AND branch != ''
             GROUP BY branch
             ORDER BY count DESC
             LIMIT 1`,
            [normalizedCnpj]
        ) as any[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0].branch || null;
        }
        return null;
    },

    // Buscar executivo mais comum dos imports desta agência
    async getMostCommonExecutive(agencyId: number): Promise<{ code: string; name?: string; email: string } | null> {
        // Buscar CNPJ da agência
        const agency = await this.findById(agencyId);
        if (!agency) {
            return null;
        }

        // Normalizar CNPJ para busca
        const normalizedCnpj = normalizeCnpj(agency.cnpj);

        // Buscar executivo mais comum nos imports desta agência
        const results = await query(
            `SELECT executive_name, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND executive_name IS NOT NULL AND executive_name != ''
             GROUP BY executive_name
             ORDER BY count DESC
             LIMIT 1`,
            [normalizedCnpj]
        ) as any[];

        if (Array.isArray(results) && results.length > 0) {
            const executiveName = results[0].executive_name;
            
            // Buscar dados completos do executivo
            const { executiveService } = await import('./executiveService');
            const executive = await executiveService.findByExecutiveName(executiveName);
            
            if (executive) {
                return {
                    code: executive.code,
                    name: executive.name || undefined,
                    email: executive.email
                };
            }
        }
        return null;
    },

    // Validar se CNPJ tem pontos importados
    async validateCnpjEligibility(cnpj: string): Promise<boolean> {
        // Normalizar CNPJ para busca (pode estar formatado ou não)
        const normalizedCnpj = normalizeCnpj(cnpj);
        // Buscar tanto com formatação quanto sem (banco pode ter ambos os formatos)
        const results = await query(
            `SELECT COUNT(*) as count FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
            [normalizedCnpj]
        ) as any[];

        const count = Array.isArray(results) && results.length > 0 ? Number(results[0].count) : 0;
        return count > 0;
    },

    // Buscar nome da agência mais comum baseado no CNPJ
    async getAgencyNameByCnpj(cnpj: string): Promise<string | null> {
        // Normalizar CNPJ para busca
        const normalizedCnpj = normalizeCnpj(cnpj);
        
        // Buscar nome da agência mais comum nos imports
        const results = await query(
            `SELECT agency_name, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND agency_name IS NOT NULL AND agency_name != ''
             GROUP BY agency_name
             ORDER BY count DESC
             LIMIT 1`,
            [normalizedCnpj]
        ) as any[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0].agency_name || null;
        }
        return null;
    },

    // Registrar agência com transação atômica
    async register(data: CreateAgencyDto): Promise<number> {
        // 1. Validar formato CPF/CNPJ
        if (!validateCnpjFormat(data.cnpj)) {
            throw new Error('Invalid CPF/CNPJ format');
        }

        // Normalizar CNPJ para armazenamento consistente
        const normalizedCnpj = normalizeCnpj(data.cnpj);

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // 2. Verificar se agência já existe (buscar normalizado)
            const [existingResults] = await connection.execute(
                `SELECT id FROM agencies 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
                [normalizedCnpj]
            ) as any[];

            if (Array.isArray(existingResults) && existingResults.length > 0) {
                throw new Error('Agency already exists');
            }

            // 3. Verificar se existe pelo menos um import item (buscar normalizado)
            const [importItemsResults] = await connection.execute(
                `SELECT COUNT(*) as count FROM agency_points_import_items 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
                [normalizedCnpj]
            ) as any[];

            const importCount = Array.isArray(importItemsResults) && importItemsResults.length > 0 
                ? Number(importItemsResults[0].count) 
                : 0;

            if (importCount === 0) {
                throw new Error('CNPJ has no imported points');
            }

            // 4. Hash da senha se fornecida (MD5)
            let hashedPassword = null;
            if (data.password) {
                hashedPassword = crypto.createHash('md5').update(data.password).digest('hex');
            }

            // 5. Buscar branch e executive_name mais comuns dos imports
            const [branchResults] = await connection.execute(
                `SELECT branch, COUNT(*) as count 
                 FROM agency_points_import_items 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
                 AND branch IS NOT NULL AND branch != ''
                 GROUP BY branch
                 ORDER BY count DESC
                 LIMIT 1`,
                [normalizedCnpj]
            ) as any[];

            const branch = Array.isArray(branchResults) && branchResults.length > 0 
                ? branchResults[0].branch 
                : null;

            const [executiveResults] = await connection.execute(
                `SELECT executive_name, COUNT(*) as count 
                 FROM agency_points_import_items 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
                 AND executive_name IS NOT NULL AND executive_name != ''
                 GROUP BY executive_name
                 ORDER BY count DESC
                 LIMIT 1`,
                [normalizedCnpj]
            ) as any[];

            const executiveName = Array.isArray(executiveResults) && executiveResults.length > 0 
                ? executiveResults[0].executive_name 
                : null;

            // 6. Criar agência com active = true (armazenar CNPJ normalizado, branch e executive_name)
            const [insertResult] = await connection.execute(
                'INSERT INTO agencies (cnpj, name, email, phone, password, branch, executive_name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())',
                [normalizedCnpj, data.name, data.email, data.phone || null, hashedPassword, branch, executiveName]
            ) as any;

            const agencyId = insertResult.insertId;

            // 6. Criar endereço dentro da mesma transação
            await addressService.create(agencyId, data.address, connection);

            // 7. Buscar todos os import items para este CNPJ (buscar normalizado)
            const [importItems] = await connection.execute(
                `SELECT id, import_id, points FROM agency_points_import_items 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`,
                [normalizedCnpj]
            ) as any[];

            // 8. Criar ledger entries para cada import item
            if (Array.isArray(importItems) && importItems.length > 0) {
                for (const item of importItems) {
                    await connection.execute(
                        'INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                        [
                            agencyId,
                            'IMPORT',
                            item.import_id,
                            item.points,
                            'Initial points import'
                        ]
                    );
                }
            }

            await connection.commit();
            return agencyId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};
