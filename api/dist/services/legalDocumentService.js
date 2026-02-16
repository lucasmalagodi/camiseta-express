"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legalDocumentService = void 0;
const db_1 = require("../config/db");
exports.legalDocumentService = {
    // ============================================
    // DOCUMENTOS LEGAIS
    // ============================================
    async create(data) {
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            // Buscar a última versão deste tipo de documento
            const [versionResults] = await connection.execute('SELECT MAX(version) as maxVersion FROM legal_documents WHERE type = ?', [data.type]);
            const maxVersion = Array.isArray(versionResults) && versionResults.length > 0 && versionResults[0].maxVersion
                ? Number(versionResults[0].maxVersion)
                : 0;
            const newVersion = maxVersion + 1;
            // Se este documento será ativado, desativar todos os outros do mesmo tipo
            if (data.active) {
                await connection.execute('UPDATE legal_documents SET active = FALSE WHERE type = ?', [data.type]);
            }
            // Criar novo documento
            const [result] = await connection.execute('INSERT INTO legal_documents (type, version, content, active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', [data.type, newVersion, data.content, data.active || false]);
            await connection.commit();
            return result.insertId;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    async findAll() {
        const [results] = await db_1.pool.execute('SELECT * FROM legal_documents ORDER BY type, version DESC');
        return Array.isArray(results) ? results : [];
    },
    async findByType(type) {
        const [results] = await db_1.pool.execute('SELECT * FROM legal_documents WHERE type = ? ORDER BY version DESC', [type]);
        return Array.isArray(results) ? results : [];
    },
    async findActiveByType(type) {
        const [results] = await db_1.pool.execute('SELECT * FROM legal_documents WHERE type = ? AND active = TRUE ORDER BY version DESC LIMIT 1', [type]);
        return Array.isArray(results) && results.length > 0 ? results[0] : null;
    },
    async findActiveDocuments() {
        const [results] = await db_1.pool.execute('SELECT * FROM legal_documents WHERE active = TRUE ORDER BY type, version DESC');
        return Array.isArray(results) ? results : [];
    },
    async findById(id) {
        const [results] = await db_1.pool.execute('SELECT * FROM legal_documents WHERE id = ?', [id]);
        return Array.isArray(results) && results.length > 0 ? results[0] : null;
    },
    async update(id, data) {
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            // Se ativando este documento, desativar outros do mesmo tipo
            if (data.active) {
                const [doc] = await connection.execute('SELECT type FROM legal_documents WHERE id = ?', [id]);
                if (Array.isArray(doc) && doc.length > 0) {
                    await connection.execute('UPDATE legal_documents SET active = FALSE WHERE type = ? AND id != ?', [doc[0].type, id]);
                }
            }
            // Atualizar documento
            const updates = [];
            const values = [];
            if (data.content !== undefined) {
                updates.push('content = ?');
                values.push(data.content);
            }
            if (data.active !== undefined) {
                updates.push('active = ?');
                values.push(data.active);
            }
            if (updates.length > 0) {
                updates.push('updated_at = NOW()');
                values.push(id);
                await connection.execute(`UPDATE legal_documents SET ${updates.join(', ')} WHERE id = ?`, values);
            }
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    async activate(id) {
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            // Buscar tipo do documento
            const [doc] = await connection.execute('SELECT type FROM legal_documents WHERE id = ?', [id]);
            if (!Array.isArray(doc) || doc.length === 0) {
                throw new Error('Document not found');
            }
            // Desativar todos os outros do mesmo tipo
            await connection.execute('UPDATE legal_documents SET active = FALSE WHERE type = ?', [doc[0].type]);
            // Ativar este documento
            await connection.execute('UPDATE legal_documents SET active = TRUE, updated_at = NOW() WHERE id = ?', [id]);
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    // ============================================
    // ACEITAÇÕES
    // ============================================
    async createAcceptance(data) {
        const [result] = await db_1.pool.execute('INSERT INTO agency_acceptances (agency_id, legal_document_id, ip_address, user_agent, accepted_at, created_at) VALUES (?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE accepted_at = NOW(), ip_address = ?, user_agent = ?', [data.agency_id, data.legal_document_id, data.ip_address, data.user_agent, data.ip_address, data.user_agent]);
        return result.insertId;
    },
    async findAcceptancesByAgency(agencyId) {
        const [results] = await db_1.pool.execute('SELECT * FROM agency_acceptances WHERE agency_id = ? ORDER BY accepted_at DESC', [agencyId]);
        return Array.isArray(results) ? results : [];
    },
    async findAcceptanceByAgencyAndDocument(agencyId, legalDocumentId) {
        const [results] = await db_1.pool.execute('SELECT * FROM agency_acceptances WHERE agency_id = ? AND legal_document_id = ?', [agencyId, legalDocumentId]);
        return Array.isArray(results) && results.length > 0 ? results[0] : null;
    },
    async hasAcceptedDocument(agencyId, legalDocumentId) {
        const acceptance = await this.findAcceptanceByAgencyAndDocument(agencyId, legalDocumentId);
        return acceptance !== null;
    },
    async getPendingDocumentsForAgency(agencyId) {
        // Buscar todos os documentos ativos
        const activeDocuments = await this.findActiveDocuments();
        // Para cada documento ativo, verificar se a agência aceitou
        const pending = [];
        for (const doc of activeDocuments) {
            const hasAccepted = await this.hasAcceptedDocument(agencyId, doc.id);
            if (!hasAccepted) {
                pending.push(doc);
            }
        }
        return pending;
    },
    async getAcceptedDocumentsForAgency(agencyId) {
        const [results] = await db_1.pool.execute(`SELECT 
                ld.*,
                aa.id as acceptance_id,
                aa.accepted_at,
                aa.ip_address,
                aa.user_agent
            FROM agency_acceptances aa
            INNER JOIN legal_documents ld ON aa.legal_document_id = ld.id
            WHERE aa.agency_id = ?
            ORDER BY aa.accepted_at DESC`, [agencyId]);
        if (!Array.isArray(results)) {
            return [];
        }
        return results.map((row) => ({
            document: {
                id: row.id,
                type: row.type,
                version: row.version,
                content: row.content,
                active: row.active,
                created_at: row.created_at,
                updated_at: row.updated_at
            },
            acceptance: {
                id: row.acceptance_id,
                agency_id: agencyId,
                legal_document_id: row.id,
                accepted_at: row.accepted_at,
                ip_address: row.ip_address,
                user_agent: row.user_agent
            }
        }));
    }
};
