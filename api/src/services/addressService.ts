import { query, pool } from '../config/db';
import { Address, CreateAddressDto } from '../types';

export const addressService = {
    async create(agencyId: number, data: CreateAddressDto, connection?: any): Promise<number> {
        // Normalizar CEP (remover formatação)
        const normalizedCep = data.cep.replace(/\D/g, '');

        // Normalizar city e state
        const normalizedCity = data.city.trim();
        const normalizedState = data.state.trim().toUpperCase();

        // Criar endereço diretamente (sem normalização de city/state)
        if (connection) {
            const [result] = await connection.execute(
                'INSERT INTO addresses (agency_id, cep, street, number, complement, neighborhood, city, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    agencyId,
                    normalizedCep,
                    data.street.trim(),
                    data.number.trim(),
                    data.complement?.trim() || null,
                    data.neighborhood.trim(),
                    normalizedCity,
                    normalizedState
                ]
            ) as any;
            return result.insertId;
        } else {
            const result = await query(
                'INSERT INTO addresses (agency_id, cep, street, number, complement, neighborhood, city, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    agencyId,
                    normalizedCep,
                    data.street.trim(),
                    data.number.trim(),
                    data.complement?.trim() || null,
                    data.neighborhood.trim(),
                    normalizedCity,
                    normalizedState
                ]
            ) as any;
            return result.insertId;
        }
    },

    async findByAgencyId(agencyId: number): Promise<Address | null> {
        const results = await query(
            `SELECT a.id, a.agency_id as agencyId, a.cep, a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.created_at as createdAt, a.updated_at as updatedAt
             FROM addresses a
             WHERE a.agency_id = ?`,
            [agencyId]
        ) as Address[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },

    async update(agencyId: number, data: CreateAddressDto, connection?: any): Promise<void> {
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
        } else {
            await query(updateQuery, params);
        }
    }
};
