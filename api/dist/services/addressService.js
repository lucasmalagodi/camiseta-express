"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressService = void 0;
const db_1 = require("../config/db");
exports.addressService = {
    async create(agencyId, data, connection) {
        // Normalizar CEP (remover formatação)
        const normalizedCep = data.cep.replace(/\D/g, '');
        // Normalizar city e state
        const normalizedCity = data.city.trim();
        const normalizedState = data.state.trim().toUpperCase();
        // Criar endereço diretamente (sem normalização de city/state)
        if (connection) {
            const [result] = await connection.execute('INSERT INTO addresses (agency_id, cep, street, number, complement, neighborhood, city, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())', [
                agencyId,
                normalizedCep,
                data.street.trim(),
                data.number.trim(),
                data.complement?.trim() || null,
                data.neighborhood.trim(),
                normalizedCity,
                normalizedState
            ]);
            return result.insertId;
        }
        else {
            const result = await (0, db_1.query)('INSERT INTO addresses (agency_id, cep, street, number, complement, neighborhood, city, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())', [
                agencyId,
                normalizedCep,
                data.street.trim(),
                data.number.trim(),
                data.complement?.trim() || null,
                data.neighborhood.trim(),
                normalizedCity,
                normalizedState
            ]);
            return result.insertId;
        }
    },
    async findByAgencyId(agencyId) {
        const results = await (0, db_1.query)(`SELECT a.id, a.agency_id as agencyId, a.cep, a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.created_at as createdAt, a.updated_at as updatedAt
             FROM addresses a
             WHERE a.agency_id = ?`, [agencyId]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    async update(agencyId, data, connection) {
        // Normalizar CEP (remover formatação)
        const normalizedCep = data.cep.replace(/\D/g, '');
        const normalizedCity = data.city.trim();
        const normalizedState = data.state.trim().toUpperCase();
        const updateQuery = `
            UPDATE addresses 
            SET cep = ?, street = ?, number = ?, complement = ?, neighborhood = ?, city = ?, state = ?, updated_at = NOW()
            WHERE agency_id = ?
        `;
        const params = [
            normalizedCep,
            data.street.trim(),
            data.number.trim(),
            data.complement?.trim() || null,
            data.neighborhood.trim(),
            normalizedCity,
            normalizedState,
            agencyId
        ];
        if (connection) {
            await connection.execute(updateQuery, params);
        }
        else {
            await (0, db_1.query)(updateQuery, params);
        }
    }
};
