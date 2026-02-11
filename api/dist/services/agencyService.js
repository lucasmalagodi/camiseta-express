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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agencyService = void 0;
const db_1 = require("../config/db");
const addressService_1 = require("./addressService");
const crypto_1 = __importDefault(require("crypto"));
// Função auxiliar para normalizar CNPJ (remove formatação)
function normalizeCnpj(cnpj) {
    return cnpj.replace(/[^\d]/g, '');
}
// Função auxiliar para validar formato de CPF/CNPJ
function validateCnpjFormat(cnpj) {
    const cleanCnpj = normalizeCnpj(cnpj);
    // CPF tem 11 dígitos, CNPJ tem 14 dígitos
    return cleanCnpj.length === 11 || cleanCnpj.length === 14;
}
exports.agencyService = {
    async create(data) {
        // Verificar se já existe agência com este CNPJ
        const existing = await this.findByCnpj(data.cnpj);
        if (existing) {
            throw new Error('Agency with this CNPJ already exists');
        }
        // Verificar se existe pelo menos um import item com este CNPJ
        const normalizedCnpj = normalizeCnpj(data.cnpj);
        const importItems = await (0, db_1.query)(`SELECT COUNT(*) as count FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`, [normalizedCnpj]);
        const count = Array.isArray(importItems) && importItems.length > 0 ? Number(importItems[0].count) : 0;
        if (count === 0) {
            throw new Error('No points import found for this CNPJ. Agency cannot be created.');
        }
        // Buscar branch e executive_name mais comuns dos imports
        const branchResults = await (0, db_1.query)(`SELECT branch, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND branch IS NOT NULL AND branch != ''
             GROUP BY branch
             ORDER BY count DESC
             LIMIT 1`, [normalizedCnpj]);
        const branch = Array.isArray(branchResults) && branchResults.length > 0
            ? branchResults[0].branch
            : null;
        const executiveResults = await (0, db_1.query)(`SELECT executive_name, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND executive_name IS NOT NULL AND executive_name != ''
             GROUP BY executive_name
             ORDER BY count DESC
             LIMIT 1`, [normalizedCnpj]);
        const executiveName = Array.isArray(executiveResults) && executiveResults.length > 0
            ? executiveResults[0].executive_name
            : null;
        // Criar agência
        const result = await (0, db_1.query)('INSERT INTO agencies (cnpj, name, email, phone, branch, executive_name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, false, NOW(), NOW())', [normalizedCnpj, data.name, data.email, data.phone || null, branch, executiveName]);
        const agencyId = result.insertId;
        // Criar endereço
        await addressService_1.addressService.create(agencyId, data.address);
        // Após criar agência, criar ledger entries para todos os import items deste CNPJ
        const importItemsForCnpj = await (0, db_1.query)(`SELECT id, import_id, points FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`, [normalizedCnpj]);
        if (Array.isArray(importItemsForCnpj) && importItemsForCnpj.length > 0) {
            for (const item of importItemsForCnpj) {
                await (0, db_1.query)('INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [
                    agencyId,
                    'IMPORT',
                    item.import_id,
                    item.points,
                    `Import from ${item.import_id}`
                ]);
            }
        }
        return agencyId;
    },
    async update(id, data) {
        const updates = [];
        const values = [];
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
        await (0, db_1.query)(`UPDATE agencies SET ${updates.join(', ')} WHERE id = ?`, values);
    },
    async softDelete(id) {
        await (0, db_1.query)('UPDATE agencies SET active = false, updated_at = NOW() WHERE id = ?', [id]);
    },
    async findById(id) {
        const results = await (0, db_1.query)('SELECT id, cnpj, name, email, phone, branch, executive_name, active, created_at as createdAt, updated_at as updatedAt FROM agencies WHERE id = ?', [id]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByCnpj(cnpj) {
        const results = await (0, db_1.query)('SELECT id, cnpj, name, email, phone, branch, executive_name, active, created_at as createdAt, updated_at as updatedAt FROM agencies WHERE cnpj = ?', [cnpj]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findByEmail(email) {
        const results = await (0, db_1.query)('SELECT id, email, password, name, active FROM agencies WHERE email = ?', [email.trim().toLowerCase()]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async findAll(active) {
        let sql = 'SELECT id, cnpj, name, email, phone, branch, executive_name, active, created_at as createdAt, updated_at as updatedAt FROM agencies';
        const values = [];
        if (active !== undefined) {
            sql += ' WHERE active = ?';
            values.push(active);
        }
        sql += ' ORDER BY created_at DESC';
        const results = await (0, db_1.query)(sql, values.length > 0 ? values : undefined);
        return Array.isArray(results) ? results : [];
    },
    // Calcular balance a partir do ledger (fonte única da verdade)
    async getBalance(agencyId) {
        const results = await (0, db_1.query)('SELECT COALESCE(SUM(points), 0) as balance FROM agency_points_ledger WHERE agency_id = ?', [agencyId]);
        if (Array.isArray(results) && results.length > 0) {
            return Number(results[0].balance) || 0;
        }
        return 0;
    },
    // Buscar filial mais comum dos imports desta agência
    async getMostCommonBranch(agencyId) {
        // Buscar CNPJ da agência
        const agency = await this.findById(agencyId);
        if (!agency) {
            return null;
        }
        // Normalizar CNPJ para busca
        const normalizedCnpj = normalizeCnpj(agency.cnpj);
        // Buscar filial mais comum nos imports desta agência
        const results = await (0, db_1.query)(`SELECT branch, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND branch IS NOT NULL AND branch != ''
             GROUP BY branch
             ORDER BY count DESC
             LIMIT 1`, [normalizedCnpj]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0].branch || null;
        }
        return null;
    },
    // Buscar executivo mais comum dos imports desta agência
    async getMostCommonExecutive(agencyId) {
        // Buscar CNPJ da agência
        const agency = await this.findById(agencyId);
        if (!agency) {
            return null;
        }
        // Normalizar CNPJ para busca
        const normalizedCnpj = normalizeCnpj(agency.cnpj);
        // Buscar executivo mais comum nos imports desta agência
        const results = await (0, db_1.query)(`SELECT executive_name, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND executive_name IS NOT NULL AND executive_name != ''
             GROUP BY executive_name
             ORDER BY count DESC
             LIMIT 1`, [normalizedCnpj]);
        if (Array.isArray(results) && results.length > 0) {
            const executiveName = results[0].executive_name;
            // Buscar dados completos do executivo
            const { executiveService } = await Promise.resolve().then(() => __importStar(require('./executiveService')));
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
    async validateCnpjEligibility(cnpj) {
        // Normalizar CNPJ para busca (pode estar formatado ou não)
        const normalizedCnpj = normalizeCnpj(cnpj);
        // Buscar tanto com formatação quanto sem (banco pode ter ambos os formatos)
        const results = await (0, db_1.query)(`SELECT COUNT(*) as count FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`, [normalizedCnpj]);
        const count = Array.isArray(results) && results.length > 0 ? Number(results[0].count) : 0;
        return count > 0;
    },
    // Buscar nome da agência mais comum baseado no CNPJ
    async getAgencyNameByCnpj(cnpj) {
        // Normalizar CNPJ para busca
        const normalizedCnpj = normalizeCnpj(cnpj);
        // Buscar nome da agência mais comum nos imports
        const results = await (0, db_1.query)(`SELECT agency_name, COUNT(*) as count 
             FROM agency_points_import_items 
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
             AND agency_name IS NOT NULL AND agency_name != ''
             GROUP BY agency_name
             ORDER BY count DESC
             LIMIT 1`, [normalizedCnpj]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0].agency_name || null;
        }
        return null;
    },
    // Registrar agência com transação atômica
    async register(data) {
        // 1. Validar formato CPF/CNPJ
        if (!validateCnpjFormat(data.cnpj)) {
            throw new Error('Invalid CPF/CNPJ format');
        }
        // Normalizar CNPJ para armazenamento consistente
        const normalizedCnpj = normalizeCnpj(data.cnpj);
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            // 2. Verificar se agência já existe (buscar normalizado)
            const [existingResults] = await connection.execute(`SELECT id FROM agencies 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`, [normalizedCnpj]);
            if (Array.isArray(existingResults) && existingResults.length > 0) {
                throw new Error('Agency already exists');
            }
            // 3. Verificar se existe pelo menos um import item (buscar normalizado)
            const [importItemsResults] = await connection.execute(`SELECT COUNT(*) as count FROM agency_points_import_items 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`, [normalizedCnpj]);
            const importCount = Array.isArray(importItemsResults) && importItemsResults.length > 0
                ? Number(importItemsResults[0].count)
                : 0;
            if (importCount === 0) {
                throw new Error('CNPJ has no imported points');
            }
            // 4. Hash da senha se fornecida (MD5)
            let hashedPassword = null;
            if (data.password) {
                hashedPassword = crypto_1.default.createHash('md5').update(data.password).digest('hex');
            }
            // 5. Buscar branch e executive_name mais comuns dos imports
            const [branchResults] = await connection.execute(`SELECT branch, COUNT(*) as count 
                 FROM agency_points_import_items 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
                 AND branch IS NOT NULL AND branch != ''
                 GROUP BY branch
                 ORDER BY count DESC
                 LIMIT 1`, [normalizedCnpj]);
            const branch = Array.isArray(branchResults) && branchResults.length > 0
                ? branchResults[0].branch
                : null;
            const [executiveResults] = await connection.execute(`SELECT executive_name, COUNT(*) as count 
                 FROM agency_points_import_items 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
                 AND executive_name IS NOT NULL AND executive_name != ''
                 GROUP BY executive_name
                 ORDER BY count DESC
                 LIMIT 1`, [normalizedCnpj]);
            const executiveName = Array.isArray(executiveResults) && executiveResults.length > 0
                ? executiveResults[0].executive_name
                : null;
            // 6. Criar agência com active = true (armazenar CNPJ normalizado, branch e executive_name)
            const [insertResult] = await connection.execute('INSERT INTO agencies (cnpj, name, email, phone, password, branch, executive_name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())', [normalizedCnpj, data.name, data.email, data.phone || null, hashedPassword, branch, executiveName]);
            const agencyId = insertResult.insertId;
            // 6. Criar endereço dentro da mesma transação
            await addressService_1.addressService.create(agencyId, data.address, connection);
            // 7. Buscar todos os import items para este CNPJ (buscar normalizado)
            const [importItems] = await connection.execute(`SELECT id, import_id, points FROM agency_points_import_items 
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?`, [normalizedCnpj]);
            // 8. Criar ledger entries para cada import item
            if (Array.isArray(importItems) && importItems.length > 0) {
                for (const item of importItems) {
                    await connection.execute('INSERT INTO agency_points_ledger (agency_id, source_type, source_id, points, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [
                        agencyId,
                        'IMPORT',
                        item.import_id,
                        item.points,
                        'Initial points import'
                    ]);
                }
            }
            await connection.commit();
            return agencyId;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
};
