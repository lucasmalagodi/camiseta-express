import { query } from '../config/db';
import { SizeChart, CreateSizeChartDto, UpdateSizeChartDto, SizeChartMeasurement } from '../types';

export const sizeChartService = {
    async getAll(): Promise<SizeChart[]> {
        const results = await query(
            'SELECT * FROM size_charts WHERE active = true ORDER BY name ASC'
        ) as any[];
        return results.map(this.mapRowToSizeChart);
    },

    async getByModel(model: 'MASCULINO' | 'FEMININO' | 'UNISEX'): Promise<Array<SizeChart & { measurements: SizeChartMeasurement[] }>> {
        // Buscar grades do modelo específico (globais, não por categoria)
        const results = await query(
            'SELECT * FROM size_charts WHERE model = ? AND active = true ORDER BY name ASC',
            [model]
        ) as any[];
        
        // Para cada grade, buscar suas measurements
        const chartsWithMeasurements = await Promise.all(
            results.map(async (row) => {
                const sizeChart = this.mapRowToSizeChart(row);
                const measurements = await query(
                    'SELECT * FROM size_chart_measurements WHERE size_chart_id = ? ORDER BY size ASC',
                    [row.id]
                ) as any[];
                
                return {
                    ...sizeChart,
                    measurements: measurements.map(this.mapRowToMeasurement),
                };
            })
        );
        
        return chartsWithMeasurements;
    },

    async getById(id: number): Promise<SizeChart & { measurements: SizeChartMeasurement[]; model?: string; categoryId?: number }> {
        const results = await query(
            'SELECT * FROM size_charts WHERE id = ?',
            [id]
        ) as any[];

        if (results.length === 0) {
            throw new Error('Grade de tamanho não encontrada');
        }

        const sizeChart = this.mapRowToSizeChart(results[0]);

        // Buscar medidas
        const measurements = await query(
            'SELECT * FROM size_chart_measurements WHERE size_chart_id = ? ORDER BY size ASC',
            [id]
        ) as any[];

        return {
            ...sizeChart,
            measurements: measurements.map(this.mapRowToMeasurement),
        };
    },

    async create(data: CreateSizeChartDto & { categoryId?: number; model: 'MASCULINO' | 'FEMININO' | 'UNISEX' }): Promise<number> {
        const result = await query(
            'INSERT INTO size_charts (name, description, model, category_id, active, created_at, updated_at) VALUES (?, ?, ?, NULL, true, NOW(), NOW())',
            [data.name, data.description || null, data.model]
        ) as any;

        const sizeChartId = result.insertId;

        // Inserir medidas
        if (data.measurements && data.measurements.length > 0) {
            for (const measurement of data.measurements) {
                await query(
                    'INSERT INTO size_chart_measurements (size_chart_id, size, chest, waist, length, shoulder, sleeve, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [
                        sizeChartId,
                        measurement.size,
                        measurement.chest || null,
                        measurement.waist || null,
                        measurement.length || null,
                        measurement.shoulder || null,
                        measurement.sleeve || null,
                    ]
                );
            }
        }

        return sizeChartId;
    },

    async update(id: number, data: UpdateSizeChartDto): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }

        if (data.description !== undefined) {
            updates.push('description = ?');
            values.push(data.description);
        }

        if (data.active !== undefined) {
            updates.push('active = ?');
            values.push(data.active ? 1 : 0);
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(id);
            await query(
                `UPDATE size_charts SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Atualizar medidas
        if (data.measurements !== undefined) {
            // Deletar medidas existentes
            await query(
                'DELETE FROM size_chart_measurements WHERE size_chart_id = ?',
                [id]
            );

            // Inserir novas medidas
            for (const measurement of data.measurements) {
                await query(
                    'INSERT INTO size_chart_measurements (size_chart_id, size, chest, waist, length, shoulder, sleeve, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [
                        id,
                        measurement.size,
                        measurement.chest || null,
                        measurement.waist || null,
                        measurement.length || null,
                        measurement.shoulder || null,
                        measurement.sleeve || null,
                    ]
                );
            }
        }
    },

    async delete(id: number): Promise<void> {
        // Deletar medidas primeiro (cascade)
        await query(
            'DELETE FROM size_chart_measurements WHERE size_chart_id = ?',
            [id]
        );

        // Deletar relacionamentos
        await query(
            'DELETE FROM product_size_charts WHERE size_chart_id = ?',
            [id]
        );

        // Deletar grade
        await query(
            'DELETE FROM size_charts WHERE id = ?',
            [id]
        );
    },

    async updateImagePath(id: number, imagePath: string): Promise<void> {
        await query(
            'UPDATE size_charts SET image_path = ?, updated_at = NOW() WHERE id = ?',
            [imagePath, id]
        );
    },

    mapRowToSizeChart(row: any): SizeChart & { model?: string; categoryId?: number } {
        const result: any = {
            id: row.id,
            name: row.name,
            description: row.description || undefined,
            active: row.active === 1 || row.active === true,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            model: row.model || undefined,
            categoryId: row.category_id || undefined,
        };
        
        // Garantir que imagePath seja sempre incluído, mesmo se for null
        if (row.image_path !== null && row.image_path !== undefined) {
            result.imagePath = row.image_path;
        } else {
            result.imagePath = null;
        }
        
        return result;
    },

    mapRowToMeasurement(row: any): SizeChartMeasurement {
        return {
            id: row.id,
            sizeChartId: row.size_chart_id,
            size: row.size,
            chest: row.chest || undefined,
            waist: row.waist || undefined,
            length: row.length || undefined,
            shoulder: row.shoulder || undefined,
            sleeve: row.sleeve || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at || row.created_at,
        };
    },
};
