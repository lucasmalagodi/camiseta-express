"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = void 0;
exports.executeReport = executeReport;
exports.executeReportConfig = executeReportConfig;
exports.createReport = createReport;
exports.updateReport = updateReport;
exports.getReportById = getReportById;
exports.getAllReports = getAllReports;
exports.getAvailableReportsForUser = getAvailableReportsForUser;
exports.deleteReport = deleteReport;
exports.createDashboardWidget = createDashboardWidget;
exports.getDashboardWidgetById = getDashboardWidgetById;
exports.getActiveDashboardWidgets = getActiveDashboardWidgets;
exports.updateDashboardWidget = updateDashboardWidget;
exports.deleteDashboardWidget = deleteDashboardWidget;
exports.getAvailableFields = getAvailableFields;
const db_1 = require("../config/db");
// Definição de campos permitidos por tabela
const ALLOWED_FIELDS = {
    agency_points_import_items: [
        'id', 'import_id', 'sale_id', 'sale_date', 'cnpj', 'agency_name',
        'branch', 'store', 'executive_name', 'supplier', 'product_name',
        'company', 'points'
    ],
    agencies: [
        'id', 'cnpj', 'name', 'email', 'phone', 'address', 'active',
        'branch', 'executive_name', 'created_at', 'updated_at'
    ],
    agency_points_ledger: [
        'id', 'agency_id', 'source_type', 'source_id', 'points',
        'description', 'created_at'
    ],
    orders: [
        'id', 'agency_id', 'total_points', 'status', 'created_at', 'updated_at'
    ],
    order_items: [
        'id', 'order_id', 'product_id', 'quantity', 'points_per_unit'
    ],
};
// Campos numéricos que podem ser usados em SUM
const NUMERIC_FIELDS = {
    agency_points_import_items: ['points'],
    agencies: [],
    agency_points_ledger: ['points'],
    orders: ['total_points'],
    order_items: ['quantity', 'points_per_unit'],
};
// Relacionamentos para JOINs
// Chave: "tabela_principal.chave_relacionamento"
// O "chave_relacionamento" é usado no formato "chave.campo" nos filtros/dimensões
const TABLE_RELATIONSHIPS = {
    'agency_points_import_items.agency': {
        table: 'agencies',
        alias: 'agencies',
        on: 'agencies.cnpj = agency_points_import_items.cnpj',
        type: 'LEFT'
    },
    'agency_points_ledger.agency': {
        table: 'agencies',
        alias: 'agencies',
        on: 'agencies.id = agency_points_ledger.agency_id',
        type: 'LEFT'
    },
    'orders.agency': {
        table: 'agencies',
        alias: 'agencies',
        on: 'agencies.id = orders.agency_id',
        type: 'LEFT'
    },
    'orders.items': {
        table: 'order_items',
        alias: 'order_items',
        on: 'order_items.order_id = orders.id',
        type: 'LEFT'
    },
    'orders.product': {
        table: 'products',
        alias: 'products',
        on: 'products.id = order_items.product_id',
        type: 'LEFT',
        requires: 'orders.items' // Requer que order_items seja feito JOIN primeiro
    },
    'order_items.order': {
        table: 'orders',
        alias: 'orders',
        on: 'orders.id = order_items.order_id',
        type: 'LEFT'
    },
    'order_items.product': {
        table: 'products',
        alias: 'products',
        on: 'products.id = order_items.product_id',
        type: 'LEFT'
    },
    // Relações quando agencies é a tabela principal
    'agencies.imports': {
        table: 'agency_points_import_items',
        alias: 'imports',
        on: 'imports.cnpj = agencies.cnpj',
        type: 'LEFT'
    },
    'agencies.orders': {
        table: 'orders',
        alias: 'orders',
        on: 'orders.agency_id = agencies.id',
        type: 'LEFT'
    },
    'agencies.order_items': {
        table: 'order_items',
        alias: 'order_items',
        on: 'order_items.order_id = orders.id',
        type: 'LEFT',
        requires: 'agencies.orders' // Requer que orders seja feito JOIN primeiro
    },
    'agencies.products': {
        table: 'products',
        alias: 'products',
        on: 'products.id = order_items.product_id',
        type: 'LEFT',
        requires: 'agencies.order_items' // Requer que order_items seja feito JOIN primeiro
    },
};
// Campos permitidos de tabelas relacionadas (para filtros)
const RELATED_TABLE_FIELDS = {
    'agencies': [
        'id', 'cnpj', 'name', 'email', 'phone', 'address', 'active',
        'branch', 'executive_name', 'created_at', 'updated_at'
    ],
    'orders': [
        'id', 'agency_id', 'total_points', 'status', 'created_at', 'updated_at'
    ],
    'order_items': [
        'id', 'order_id', 'product_id', 'quantity', 'points_per_unit'
    ],
    'products': [
        'id', 'category_id', 'name', 'description', 'quantity', 'active',
        'created_at', 'updated_at'
    ],
    'imports': [
        'id', 'import_id', 'sale_id', 'sale_date', 'cnpj', 'agency_name',
        'branch', 'store', 'executive_name', 'supplier', 'product_name',
        'company', 'points'
    ],
};
/**
 * Valida se um campo é permitido para uma tabela
 */
function isFieldAllowed(table, field) {
    const allowed = ALLOWED_FIELDS[table];
    return allowed.includes(field);
}
/**
 * Valida se um campo pode ser usado em SUM
 */
function isNumericField(table, field) {
    const numeric = NUMERIC_FIELDS[table];
    return numeric.includes(field);
}
/**
 * Escapa um identificador SQL (nome de tabela/coluna)
 */
function escapeIdentifier(identifier) {
    // Remove caracteres perigosos e permite apenas alfanuméricos, underscore e ponto
    if (!/^[a-zA-Z0-9_.]+$/.test(identifier)) {
        throw new Error(`Identificador inválido: ${identifier}`);
    }
    return `\`${identifier.replace(/`/g, '')}\``;
}
/**
 * Escapa um valor SQL
 */
function escapeValue(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }
    // String - escapa aspas e caracteres especiais
    return `'${String(value).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}
/**
 * Valida se um campo de tabela relacionada é permitido
 */
function isRelatedFieldAllowed(relatedTable, field) {
    const allowed = RELATED_TABLE_FIELDS[relatedTable];
    if (!allowed) {
        return false;
    }
    return allowed.includes(field);
}
/**
 * Obtém os JOINs necessários baseado nos filtros, dimensões e métricas
 */
function getRequiredJoins(table, filters, dimensions, metrics) {
    const joins = [];
    const addedJoins = new Set();
    // Função auxiliar para adicionar JOIN e suas dependências
    const addJoinWithDependencies = (joinKey) => {
        if (addedJoins.has(joinKey)) {
            return;
        }
        const relationship = TABLE_RELATIONSHIPS[joinKey];
        if (!relationship) {
            return;
        }
        // Se o relacionamento requer outro JOIN, adicionar primeiro
        if (relationship.requires) {
            addJoinWithDependencies(relationship.requires);
        }
        // Adicionar o JOIN
        joins.push({ key: joinKey, relationship });
        addedJoins.add(joinKey);
    };
    // Verificar filtros que referenciam tabelas relacionadas
    if (filters) {
        for (const filter of filters) {
            // Formato: "relationship_key.field" ou apenas "field" (tabela principal)
            const parts = filter.field.split('.');
            if (parts.length === 2) {
                const [relationshipKey, field] = parts;
                const joinKey = `${table}.${relationshipKey}`;
                const relationship = TABLE_RELATIONSHIPS[joinKey];
                if (relationship) {
                    // Validar usando o alias da tabela relacionada
                    if (isRelatedFieldAllowed(relationship.alias, field)) {
                        addJoinWithDependencies(joinKey);
                    }
                }
            }
        }
    }
    // Verificar dimensões que referenciam tabelas relacionadas
    if (dimensions) {
        for (const dim of dimensions) {
            const parts = dim.field.split('.');
            if (parts.length === 2) {
                const [relationshipKey, field] = parts;
                const joinKey = `${table}.${relationshipKey}`;
                const relationship = TABLE_RELATIONSHIPS[joinKey];
                if (relationship) {
                    // Validar usando o alias da tabela relacionada
                    if (isRelatedFieldAllowed(relationship.alias, field)) {
                        addJoinWithDependencies(joinKey);
                    }
                }
            }
        }
    }
    // Verificar métricas que referenciam tabelas relacionadas
    if (metrics) {
        for (const metric of metrics) {
            const parts = metric.field.split('.');
            if (parts.length === 2) {
                const [relationshipKey, field] = parts;
                const joinKey = `${table}.${relationshipKey}`;
                const relationship = TABLE_RELATIONSHIPS[joinKey];
                if (relationship) {
                    // Validar usando o alias da tabela relacionada
                    if (isRelatedFieldAllowed(relationship.alias, field)) {
                        addJoinWithDependencies(joinKey);
                    }
                }
            }
        }
    }
    return joins;
}
/**
 * Obtém o alias da tabela relacionada baseado na chave do relacionamento
 */
function getRelatedTableAlias(table, relationshipKey) {
    // Normalizar a chave: "agencie" -> "agency"
    let normalizedKey = relationshipKey;
    if (relationshipKey === 'agencie') {
        normalizedKey = 'agency';
    }
    const fullKey = `${table}.${normalizedKey}`;
    const relationship = TABLE_RELATIONSHIPS[fullKey];
    // Se não encontrou, tentar variações comuns (plural/singular)
    if (!relationship) {
        // Tentar com "s" no final (agency -> agencies)
        const pluralKey = `${table}.${normalizedKey}s`;
        const pluralRelationship = TABLE_RELATIONSHIPS[pluralKey];
        if (pluralRelationship) {
            return pluralRelationship.alias;
        }
        // Tentar sem "s" no final (agencies -> agency)
        if (normalizedKey.endsWith('s')) {
            const singularKey = `${table}.${normalizedKey.slice(0, -1)}`;
            const singularRelationship = TABLE_RELATIONSHIPS[singularKey];
            if (singularRelationship) {
                return singularRelationship.alias;
            }
        }
    }
    return relationship ? relationship.alias : null;
}
/**
 * Valida e constrói a cláusula WHERE
 * Suporta campos de tabelas relacionadas no formato "relationship_key.field"
 */
function buildWhereClause(table, filters) {
    if (!filters || filters.length === 0) {
        return { sql: '', params: [] };
    }
    const conditions = [];
    const params = [];
    for (const filter of filters) {
        let fieldSql;
        // Verificar se é campo de tabela relacionada (formato: "relationship_key.field")
        const parts = filter.field.split('.');
        if (parts.length === 2) {
            const [relationshipKey, field] = parts;
            // Obter o alias da tabela relacionada
            const relatedTableAlias = getRelatedTableAlias(table, relationshipKey);
            if (!relatedTableAlias) {
                throw new Error(`Relacionamento não encontrado: ${relationshipKey}`);
            }
            // Validar campo da tabela relacionada usando o alias
            if (!isRelatedFieldAllowed(relatedTableAlias, field)) {
                throw new Error(`Campo não permitido na tabela relacionada: ${relatedTableAlias}.${field}`);
            }
            // Usar o alias da tabela no SQL
            fieldSql = escapeIdentifier(relatedTableAlias) + '.' + escapeIdentifier(field);
        }
        else {
            // Campo da tabela principal
            if (!isFieldAllowed(table, filter.field)) {
                throw new Error(`Campo não permitido: ${filter.field}`);
            }
            fieldSql = escapeIdentifier(table) + '.' + escapeIdentifier(filter.field);
        }
        switch (filter.operator) {
            case '=':
            case '!=':
            case '>':
            case '<':
            case '>=':
            case '<=':
                conditions.push(`${fieldSql} ${filter.operator} ?`);
                params.push(filter.value);
                break;
            case 'LIKE':
                conditions.push(`${fieldSql} LIKE ?`);
                params.push(`%${filter.value}%`);
                break;
            case 'IN':
                if (!Array.isArray(filter.value)) {
                    throw new Error('Valor para IN deve ser um array');
                }
                const placeholders = filter.value.map(() => '?').join(', ');
                conditions.push(`${fieldSql} IN (${placeholders})`);
                params.push(...filter.value);
                break;
            case 'NOT IN':
                if (!Array.isArray(filter.value)) {
                    throw new Error('Valor para NOT IN deve ser um array');
                }
                const notInPlaceholders = filter.value.map(() => '?').join(', ');
                conditions.push(`${fieldSql} NOT IN (${notInPlaceholders})`);
                params.push(...filter.value);
                break;
            case 'IS NULL':
                conditions.push(`${fieldSql} IS NULL`);
                break;
            case 'IS NOT NULL':
                conditions.push(`${fieldSql} IS NOT NULL`);
                break;
            default:
                throw new Error(`Operador não permitido: ${filter.operator}`);
        }
    }
    return {
        sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
    };
}
/**
 * Valida e constrói a cláusula GROUP BY
 * Suporta campos de tabelas relacionadas no formato "relationship_key.field"
 */
function buildGroupByClause(table, dimensions) {
    if (!dimensions || dimensions.length === 0) {
        return '';
    }
    const fields = [];
    for (const dim of dimensions) {
        // Verificar se é campo de tabela relacionada
        const parts = dim.field.split('.');
        if (parts.length === 2) {
            const [relationshipKey, field] = parts;
            // Obter o alias da tabela relacionada
            const relatedTableAlias = getRelatedTableAlias(table, relationshipKey);
            if (!relatedTableAlias) {
                throw new Error(`Relacionamento não encontrado: ${relationshipKey}`);
            }
            // Validar campo da tabela relacionada usando o alias
            if (!isRelatedFieldAllowed(relatedTableAlias, field)) {
                throw new Error(`Campo não permitido na tabela relacionada: ${relatedTableAlias}.${field}`);
            }
            // Usar o alias da tabela no SQL
            fields.push(escapeIdentifier(relatedTableAlias) + '.' + escapeIdentifier(field));
        }
        else {
            // Campo da tabela principal
            if (!isFieldAllowed(table, dim.field)) {
                throw new Error(`Campo não permitido: ${dim.field}`);
            }
            fields.push(escapeIdentifier(table) + '.' + escapeIdentifier(dim.field));
        }
    }
    return fields.length > 0 ? `GROUP BY ${fields.join(', ')}` : '';
}
/**
 * Valida e constrói a cláusula SELECT com métricas
 */
function buildSelectClause(table, dimensions, metrics) {
    const selects = [];
    // Adicionar dimensões
    if (dimensions && dimensions.length > 0) {
        for (const dim of dimensions) {
            // Verificar se é campo de tabela relacionada
            const parts = dim.field.split('.');
            if (parts.length === 2) {
                const [relationshipKey, field] = parts;
                // Obter o alias da tabela relacionada
                const relatedTableAlias = getRelatedTableAlias(table, relationshipKey);
                if (!relatedTableAlias) {
                    throw new Error(`Relacionamento não encontrado: ${relationshipKey}`);
                }
                // Validar campo da tabela relacionada usando o alias
                if (!isRelatedFieldAllowed(relatedTableAlias, field)) {
                    throw new Error(`Campo não permitido na tabela relacionada: ${relatedTableAlias}.${field}`);
                }
                // Usar o alias da tabela no SQL
                const fieldSql = escapeIdentifier(relatedTableAlias) + '.' + escapeIdentifier(field);
                const alias = dim.alias ? ` AS ${escapeIdentifier(dim.alias)}` : '';
                selects.push(`${fieldSql}${alias}`);
            }
            else {
                // Campo da tabela principal
                if (!isFieldAllowed(table, dim.field)) {
                    throw new Error(`Campo não permitido: ${dim.field}`);
                }
                const fieldSql = escapeIdentifier(table) + '.' + escapeIdentifier(dim.field);
                const alias = dim.alias ? ` AS ${escapeIdentifier(dim.alias)}` : '';
                selects.push(`${fieldSql}${alias}`);
            }
        }
    }
    // Adicionar métricas
    if (metrics && metrics.length > 0) {
        for (const metric of metrics) {
            let fieldSql;
            let isNumeric;
            // Verificar se é campo de tabela relacionada (formato: "relationship_key.field")
            const parts = metric.field.split('.');
            if (parts.length === 2) {
                const [relationshipKey, field] = parts;
                // Obter o alias da tabela relacionada
                const relatedTableAlias = getRelatedTableAlias(table, relationshipKey);
                if (!relatedTableAlias) {
                    throw new Error(`Relacionamento não encontrado: ${relationshipKey}`);
                }
                // Validar campo da tabela relacionada usando o alias
                if (!isRelatedFieldAllowed(relatedTableAlias, field)) {
                    throw new Error(`Campo não permitido na tabela relacionada: ${relatedTableAlias}.${field}`);
                }
                // Verificar se é numérico (para tabelas relacionadas)
                // Campos numéricos conhecidos para tabelas relacionadas
                const numericFields = {
                    'imports': ['points'],
                    'orders': ['total_points'],
                    'order_items': ['quantity', 'points_per_unit'],
                };
                isNumeric = numericFields[relatedTableAlias]?.includes(field) || false;
                // Usar o alias da tabela no SQL
                fieldSql = escapeIdentifier(relatedTableAlias) + '.' + escapeIdentifier(field);
            }
            else {
                // Campo da tabela principal
                if (!isFieldAllowed(table, metric.field)) {
                    throw new Error(`Campo não permitido: ${metric.field}`);
                }
                isNumeric = isNumericField(table, metric.field);
                fieldSql = escapeIdentifier(table) + '.' + escapeIdentifier(metric.field);
            }
            let metricSql = '';
            if (metric.operation === 'SUM') {
                if (!isNumeric) {
                    throw new Error(`Campo ${metric.field} não pode ser usado em SUM`);
                }
                metricSql = `SUM(${fieldSql})`;
            }
            else if (metric.operation === 'COUNT') {
                metricSql = `COUNT(${fieldSql})`;
            }
            else {
                throw new Error(`Operação não permitida: ${metric.operation}`);
            }
            // Se não há alias definido, gerar um nome padrão mais amigável
            let aliasName = metric.alias;
            if (!aliasName || aliasName.trim() === '') {
                const parts = metric.field.split('.');
                const fieldName = parts.length > 1 ? parts[1] : metric.field;
                aliasName = metric.operation === 'SUM'
                    ? `total_${fieldName}`
                    : `contagem_${fieldName}`;
            }
            const alias = ` AS ${escapeIdentifier(aliasName)}`;
            selects.push(`${metricSql}${alias}`);
        }
    }
    // Se não há métricas nem dimensões, retornar erro (deve ter pelo menos um)
    if (selects.length === 0) {
        throw new Error('O relatório deve ter pelo menos uma métrica ou uma dimensão (coluna) para exibir dados.');
    }
    return selects.join(', ');
}
/**
 * Valida e constrói a cláusula ORDER BY
 * Quando há GROUP BY, só pode ordenar por campos do GROUP BY ou métricas agregadas
 * IMPORTANTE: Quando há GROUP BY sem alias, usar posição numérica da coluna no SELECT
 */
function buildOrderByClause(table, sort, dimensions, metrics, hasGroupBy, getColumnPosition) {
    if (!sort || sort.length === 0) {
        return '';
    }
    const orders = [];
    for (const s of sort) {
        const direction = s.direction === 'DESC' ? 'DESC' : 'ASC';
        // Se há GROUP BY, só pode ordenar por dimensões ou métricas
        if (hasGroupBy) {
            // Verificar se o campo está nas dimensões
            const dimension = dimensions?.find(d => d.field === s.field);
            if (dimension) {
                // Quando há GROUP BY, usar alias se existir, senão usar posição numérica
                if (dimension.alias) {
                    orders.push(`${escapeIdentifier(dimension.alias)} ${direction}`);
                }
                else {
                    // Usar posição numérica da coluna no SELECT (permitido pelo MySQL)
                    const position = getColumnPosition(s.field);
                    if (position === -1) {
                        throw new Error(`Campo '${s.field}' não encontrado no SELECT`);
                    }
                    orders.push(`${position} ${direction}`);
                }
                continue;
            }
            // Verificar se o campo está nas métricas (pode ser o campo ou o alias)
            const metric = metrics?.find(m => m.field === s.field || (m.alias && m.alias === s.field));
            if (metric) {
                // Quando há GROUP BY, usar alias se existir, senão usar posição numérica
                if (metric.alias) {
                    orders.push(`${escapeIdentifier(metric.alias)} ${direction}`);
                }
                else {
                    // Usar posição numérica da coluna no SELECT (permitido pelo MySQL)
                    const position = getColumnPosition(s.field);
                    if (position === -1) {
                        throw new Error(`Campo '${s.field}' não encontrado no SELECT`);
                    }
                    orders.push(`${position} ${direction}`);
                }
                continue;
            }
            // Se não está nas dimensões nem nas métricas, não pode ordenar
            const dimensionFields = dimensions?.map(d => d.field).join(', ') || 'nenhuma';
            const metricFields = metrics?.map(m => m.alias || m.field).join(', ') || 'nenhuma';
            throw new Error(`Campo '${s.field}' não pode ser usado em ORDER BY quando há GROUP BY. ` +
                `Use apenas dimensões selecionadas (${dimensionFields}) ou métricas (${metricFields}).`);
        }
        else {
            // Sem GROUP BY, validar se o campo é permitido
            if (!isFieldAllowed(table, s.field)) {
                throw new Error(`Campo não permitido na ordenação: ${s.field}`);
            }
            orders.push(`${escapeIdentifier(table)}.${escapeIdentifier(s.field)} ${direction}`);
        }
    }
    return orders.length > 0 ? `ORDER BY ${orders.join(', ')}` : '';
}
/**
 * Constrói a query SQL completa de forma segura
 */
function buildQuery(table, config) {
    const mainTable = escapeIdentifier(table);
    // Obter JOINs necessários
    const requiredJoins = getRequiredJoins(table, config.filters, config.dimensions, config.metrics);
    // Construir SELECT e obter informações sobre as colunas para ORDER BY
    const selectClause = buildSelectClause(table, config.dimensions, config.metrics);
    // Construir FROM com JOINs
    let fromClause = `FROM ${mainTable}`;
    for (const join of requiredJoins) {
        const joinType = join.relationship.type || 'LEFT';
        fromClause += ` ${joinType} JOIN ${escapeIdentifier(join.relationship.table)} ${escapeIdentifier(join.relationship.alias)} ON ${join.relationship.on}`;
    }
    // Construir WHERE
    const { sql: whereClause, params: whereParams } = buildWhereClause(table, config.filters);
    // Construir GROUP BY
    const groupByClause = buildGroupByClause(table, config.dimensions);
    const hasGroupBy = groupByClause.length > 0;
    // Calcular posições das colunas no SELECT para ORDER BY
    // Contar quantas colunas existem antes de cada campo usado no ORDER BY
    const getColumnPosition = (field) => {
        let position = 1;
        // Contar dimensões
        if (config.dimensions) {
            for (const dim of config.dimensions) {
                if (dim.field === field) {
                    return position;
                }
                position++;
            }
        }
        // Contar métricas (verificar tanto pelo campo quanto pelo alias)
        if (config.metrics) {
            for (const metric of config.metrics) {
                if (metric.field === field || (metric.alias && metric.alias === field)) {
                    return position;
                }
                position++;
            }
        }
        return -1; // Campo não encontrado
    };
    // Construir ORDER BY (precisa saber se há GROUP BY e posições das colunas)
    const orderByClause = buildOrderByClause(table, config.sort, config.dimensions, config.metrics, hasGroupBy, getColumnPosition);
    // Construir LIMIT
    const limitClause = config.limit && config.limit > 0 ? `LIMIT ${Math.min(config.limit, 10000)}` : '';
    // Montar query completa
    const sql = [
        `SELECT ${selectClause}`,
        fromClause,
        whereClause,
        groupByClause,
        orderByClause,
        limitClause,
    ]
        .filter(Boolean)
        .join(' ');
    return { sql, params: whereParams };
}
/**
 * Executa um relatório e retorna os dados
 */
async function executeReport(reportId) {
    const report = await getReportById(reportId);
    if (!report) {
        throw new Error('Relatório não encontrado');
    }
    const { sql, params } = buildQuery(report.sourceTable, report.configJson);
    // Executar query
    const results = await (0, db_1.query)(sql, params);
    return results;
}
/**
 * Executa um relatório diretamente com configuração
 */
async function executeReportConfig(sourceTable, config) {
    const { sql, params } = buildQuery(sourceTable, config);
    const results = await (0, db_1.query)(sql, params);
    return results;
}
/**
 * Cria um novo relatório
 */
async function createReport(dto, userId) {
    try {
        // Validar configuração
        validateReportConfig(dto.sourceTable, dto.config);
    }
    catch (validationError) {
        // Re-lançar erro de validação com mensagem mais clara
        throw new Error(`Erro de validação: ${validationError.message}`);
    }
    try {
        const result = await (0, db_1.query)(`INSERT INTO reports (name, source_table, visualization_type, config_json, created_by, is_public)
             VALUES (?, ?, ?, ?, ?, ?)`, [
            dto.name,
            dto.sourceTable,
            dto.visualizationType,
            JSON.stringify(dto.config),
            userId,
            dto.isPublic ? 1 : 0,
        ]);
        const createdReport = await getReportById(result.insertId);
        if (!createdReport) {
            throw new Error('Erro ao recuperar relatório recém-criado');
        }
        return createdReport;
    }
    catch (dbError) {
        console.error('Database error creating report:', dbError);
        throw new Error(`Erro ao salvar no banco de dados: ${dbError.message || 'Erro desconhecido'}`);
    }
}
/**
 * Atualiza um relatório
 */
async function updateReport(id, dto) {
    const existing = await getReportById(id);
    if (!existing) {
        throw new Error('Relatório não encontrado');
    }
    const updates = [];
    const params = [];
    if (dto.name !== undefined) {
        updates.push('name = ?');
        params.push(dto.name);
    }
    if (dto.sourceTable !== undefined) {
        updates.push('source_table = ?');
        params.push(dto.sourceTable);
    }
    if (dto.visualizationType !== undefined) {
        updates.push('visualization_type = ?');
        params.push(dto.visualizationType);
    }
    if (dto.config !== undefined) {
        // Validar configuração com a tabela (nova ou existente)
        const table = dto.sourceTable || existing.sourceTable;
        validateReportConfig(table, dto.config);
        updates.push('config_json = ?');
        params.push(JSON.stringify(dto.config));
    }
    if (dto.isPublic !== undefined) {
        updates.push('is_public = ?');
        params.push(dto.isPublic ? 1 : 0);
    }
    if (updates.length === 0) {
        return existing;
    }
    params.push(id);
    await (0, db_1.query)(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`, params);
    const updatedReport = await getReportById(id);
    if (!updatedReport) {
        throw new Error('Erro ao recuperar relatório após atualização');
    }
    return updatedReport;
}
/**
 * Valida uma configuração de relatório com regras rigorosas
 */
function validateReportConfig(table, config) {
    // REGRA 1: Se não tem métrica, deve ter pelo menos uma dimensão para listar dados
    const hasMetrics = config.metrics && config.metrics.length > 0;
    const hasDimensions = config.dimensions && config.dimensions.length > 0;
    if (!hasMetrics && !hasDimensions) {
        throw new Error('O relatório deve ter pelo menos uma métrica (soma ou contagem) ou pelo menos uma coluna (dimensão) para exibir dados.');
    }
    // REGRA 2: Métricas agregadas requerem agrupamento (dimensions)
    if (hasMetrics && !hasDimensions) {
        throw new Error('Métricas agregadas (SUM/COUNT) requerem pelo menos uma dimensão para agrupamento. Selecione uma ou mais colunas para agrupar os dados.');
    }
    // Validar dimensões
    if (config.dimensions) {
        for (const dim of config.dimensions) {
            // Verificar se é campo de tabela relacionada
            const parts = dim.field.split('.');
            if (parts.length === 2) {
                const [relationshipKey, field] = parts;
                // Obter o alias da tabela relacionada
                const relatedTableAlias = getRelatedTableAlias(table, relationshipKey);
                if (!relatedTableAlias) {
                    throw new Error(`Relacionamento não encontrado na dimensão: ${relationshipKey}`);
                }
                // Validar usando o alias da tabela relacionada
                if (!isRelatedFieldAllowed(relatedTableAlias, field)) {
                    throw new Error(`Campo não permitido na dimensão: ${relatedTableAlias}.${field}`);
                }
            }
            else {
                // Campo da tabela principal
                if (!isFieldAllowed(table, dim.field)) {
                    throw new Error(`Campo não permitido na dimensão: ${dim.field}`);
                }
            }
        }
    }
    // Validar métricas
    if (config.metrics) {
        for (const metric of config.metrics) {
            // Métricas só podem ser da tabela principal (não de tabelas relacionadas)
            if (!isFieldAllowed(table, metric.field)) {
                throw new Error(`Campo não permitido na métrica: ${metric.field}`);
            }
            if (metric.operation === 'SUM' && !isNumericField(table, metric.field)) {
                throw new Error(`Campo ${metric.field} não pode ser usado em SUM. Apenas campos numéricos podem ser somados.`);
            }
            if (metric.operation !== 'SUM' && metric.operation !== 'COUNT') {
                throw new Error(`Operação não permitida: ${metric.operation}. Use apenas SUM ou COUNT.`);
            }
        }
    }
    // Validar filtros
    if (config.filters) {
        for (const filter of config.filters) {
            // Verificar se é campo de tabela relacionada
            const parts = filter.field.split('.');
            if (parts.length === 2) {
                const [relationshipKey, field] = parts;
                // Obter o alias da tabela relacionada
                const relatedTableAlias = getRelatedTableAlias(table, relationshipKey);
                if (!relatedTableAlias) {
                    // Tentar encontrar o relacionamento com diferentes variações
                    const fullKey = `${table}.${relationshipKey}`;
                    const availableKeys = Object.keys(TABLE_RELATIONSHIPS).filter(k => k.startsWith(`${table}.`));
                    throw new Error(`Relacionamento não encontrado no filtro: ${relationshipKey}. ` +
                        `Chave completa tentada: ${fullKey}. ` +
                        `Relacionamentos disponíveis para ${table}: ${availableKeys.map(k => k.replace(`${table}.`, '')).join(', ')}`);
                }
                // Validar usando o alias da tabela relacionada
                if (!isRelatedFieldAllowed(relatedTableAlias, field)) {
                    const allowedFields = RELATED_TABLE_FIELDS[relatedTableAlias] || [];
                    throw new Error(`Campo não permitido no filtro: ${relatedTableAlias}.${field}. ` +
                        `Campos permitidos em ${relatedTableAlias}: ${allowedFields.join(', ')}`);
                }
            }
            else {
                // Campo da tabela principal
                if (!isFieldAllowed(table, filter.field)) {
                    throw new Error(`Campo não permitido no filtro: ${filter.field}`);
                }
            }
        }
    }
    // REGRA 3: Validar ordenação - só pode ordenar por métricas ou dimensões selecionadas
    if (config.sort) {
        const availableFieldsForSort = [];
        // Adicionar dimensões disponíveis
        if (config.dimensions) {
            config.dimensions.forEach(dim => {
                availableFieldsForSort.push(dim.field);
            });
        }
        // Adicionar métricas disponíveis (usando alias se existir, senão o campo)
        if (config.metrics) {
            config.metrics.forEach(metric => {
                // Para métricas agregadas, usar o alias ou o campo
                availableFieldsForSort.push(metric.alias || metric.field);
            });
        }
        for (const s of config.sort) {
            // Verificar se o campo de ordenação está nas dimensões ou métricas selecionadas
            const isValidSortField = availableFieldsForSort.includes(s.field) ||
                config.dimensions?.some(d => d.field === s.field) ||
                config.metrics?.some(m => (m.alias || m.field) === s.field);
            if (!isValidSortField) {
                const dimensionFields = config.dimensions?.map(d => d.field).join(', ') || 'nenhuma';
                const metricFields = config.metrics?.map(m => m.alias || m.field).join(', ') || 'nenhuma';
                throw new Error(`Campo de ordenação inválido: "${s.field}". ` +
                    `Você só pode ordenar por dimensões selecionadas (${dimensionFields}) ou métricas (${metricFields}).`);
            }
            // Validar se o campo existe na tabela (validação de segurança)
            const parts = s.field.split('.');
            if (parts.length === 2) {
                const [relationshipKey, field] = parts;
                const relatedTableAlias = getRelatedTableAlias(table, relationshipKey);
                if (!relatedTableAlias) {
                    throw new Error(`Relacionamento não encontrado na ordenação: ${relationshipKey}`);
                }
                if (!isRelatedFieldAllowed(relatedTableAlias, field)) {
                    throw new Error(`Campo não permitido na ordenação: ${relatedTableAlias}.${field}`);
                }
            }
            else {
                // Campo da tabela principal - verificar se está nas dimensões ou métricas
                const isDimension = config.dimensions?.some(d => d.field === s.field);
                const isMetric = config.metrics?.some(m => m.field === s.field);
                if (!isDimension && !isMetric) {
                    if (!isFieldAllowed(table, s.field)) {
                        throw new Error(`Campo não permitido na ordenação: ${s.field}`);
                    }
                }
            }
        }
        // REGRA 4: Limite requerido quando ordenando por métrica agregada
        if (config.sort.length > 0 && config.metrics && config.metrics.length > 0) {
            const sortingByMetric = config.sort.some(s => config.metrics?.some(m => (m.alias || m.field) === s.field));
            if (sortingByMetric && (!config.limit || config.limit <= 0)) {
                throw new Error('Quando ordenar por uma métrica agregada, você deve definir um limite de resultados (ex: 10, 50, 100).');
            }
        }
    }
    // Validar limite
    if (config.limit !== undefined && (config.limit < 0 || config.limit > 10000)) {
        throw new Error('Limite deve estar entre 0 e 10000');
    }
}
/**
 * Helper para parsear config_json que pode vir como objeto ou string
 */
function parseConfigJson(configJson) {
    // Se já é um objeto, retornar diretamente
    if (typeof configJson === 'object' && configJson !== null) {
        return configJson;
    }
    // Se é string, fazer parse
    if (typeof configJson === 'string') {
        try {
            return JSON.parse(configJson);
        }
        catch (e) {
            console.error('Erro ao fazer parse do config_json:', e, 'Valor:', configJson);
            throw new Error(`Erro ao processar configuração do relatório: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
        }
    }
    // Caso inesperado
    console.error('config_json com tipo inesperado:', typeof configJson, configJson);
    throw new Error(`Tipo inesperado para config_json: ${typeof configJson}`);
}
/**
 * Busca um relatório por ID
 */
async function getReportById(id) {
    const results = await (0, db_1.query)(`SELECT * FROM reports WHERE id = ?`, [id]);
    if (results.length === 0) {
        return null;
    }
    const row = results[0];
    return {
        id: row.id,
        name: row.name,
        sourceTable: row.source_table,
        visualizationType: row.visualization_type,
        configJson: parseConfigJson(row.config_json),
        createdBy: row.created_by,
        isPublic: Boolean(row.is_public),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
/**
 * Lista todos os relatórios
 */
async function getAllReports() {
    const results = await (0, db_1.query)(`SELECT * FROM reports ORDER BY created_at DESC`);
    return results.map(row => ({
        id: row.id,
        name: row.name,
        sourceTable: row.source_table,
        visualizationType: row.visualization_type,
        configJson: parseConfigJson(row.config_json),
        createdBy: row.created_by,
        isPublic: Boolean(row.is_public),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}
/**
 * Lista relatórios disponíveis para um usuário (públicos ou do próprio usuário)
 */
async function getAvailableReportsForUser(userId) {
    const results = await (0, db_1.query)(`SELECT * FROM reports 
         WHERE is_public = TRUE OR created_by = ?
         ORDER BY created_at DESC`, [userId]);
    return results.map(row => ({
        id: row.id,
        name: row.name,
        sourceTable: row.source_table,
        visualizationType: row.visualization_type,
        configJson: parseConfigJson(row.config_json),
        createdBy: row.created_by,
        isPublic: Boolean(row.is_public),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}
/**
 * Deleta um relatório
 * Os widgets associados serão deletados automaticamente via CASCADE
 */
async function deleteReport(id) {
    // Verificar se o relatório existe
    const report = await getReportById(id);
    if (!report) {
        throw new Error('Relatório não encontrado');
    }
    console.log(`[deleteReport] Deletando relatório ID: ${id}, Nome: ${report.name}`);
    // Deletar widgets associados explicitamente (backup caso CASCADE não funcione)
    const widgetsDeleted = await (0, db_1.query)(`DELETE FROM dashboard_widgets WHERE report_id = ?`, [id]);
    console.log(`[deleteReport] Widgets deletados: ${widgetsDeleted.affectedRows || 0}`);
    // Deletar o relatório
    const result = await (0, db_1.query)(`DELETE FROM reports WHERE id = ?`, [id]);
    console.log(`[deleteReport] Relatório deletado. Linhas afetadas: ${result.affectedRows || 0}`);
    if (result.affectedRows === 0) {
        throw new Error('Nenhum relatório foi deletado. Verifique se o ID existe.');
    }
}
/**
 * Cria um widget no dashboard
 */
async function createDashboardWidget(dto, userId) {
    // Verificar se o relatório existe
    const report = await getReportById(dto.reportId);
    if (!report) {
        throw new Error('Relatório não encontrado');
    }
    // Verificar se o relatório é público ou pertence ao usuário
    if (!report.isPublic && report.createdBy !== userId) {
        throw new Error('Você não tem permissão para adicionar este relatório ao dashboard');
    }
    // Se não especificou posição, usar a próxima disponível para este usuário
    let position = dto.position;
    if (position === undefined) {
        const maxPos = await (0, db_1.query)(`SELECT COALESCE(MAX(position), -1) + 1 AS next_position 
             FROM dashboard_widgets 
             WHERE user_id = ?`, [userId]);
        position = maxPos[0]?.next_position || 0;
    }
    const expanded = dto.expanded !== undefined ? dto.expanded : 0;
    const result = await (0, db_1.query)(`INSERT INTO dashboard_widgets (user_id, report_id, position, expanded, active)
         VALUES (?, ?, ?, ?, TRUE)`, [userId, dto.reportId, position, expanded]);
    const createdWidget = await getDashboardWidgetById(result.insertId);
    if (!createdWidget) {
        throw new Error('Erro ao recuperar widget recém-criado');
    }
    return createdWidget;
}
/**
 * Busca um widget por ID
 */
async function getDashboardWidgetById(id) {
    const results = await (0, db_1.query)(`SELECT 
            w.id AS widget_id,
            w.user_id,
            w.report_id,
            w.position,
            w.expanded,
            w.active,
            w.created_at AS widget_created_at,
            w.updated_at AS widget_updated_at,
            r.id AS report_id,
            r.name AS report_name,
            r.source_table,
            r.visualization_type,
            r.config_json,
            r.created_by,
            r.is_public,
            r.created_at AS report_created_at,
            r.updated_at AS report_updated_at
         FROM dashboard_widgets w
         INNER JOIN reports r ON w.report_id = r.id
         WHERE w.id = ?`, [id]);
    if (results.length === 0) {
        return null;
    }
    const row = results[0];
    return {
        id: row.widget_id,
        userId: row.user_id,
        reportId: row.report_id,
        position: row.position,
        expanded: row.expanded !== null && row.expanded !== undefined ? row.expanded : 0,
        active: Boolean(row.active),
        createdAt: row.widget_created_at,
        updatedAt: row.widget_updated_at,
        report: {
            id: row.report_id,
            name: row.report_name,
            sourceTable: row.source_table,
            visualizationType: row.visualization_type,
            configJson: parseConfigJson(row.config_json),
            createdBy: row.created_by,
            isPublic: Boolean(row.is_public),
            createdAt: row.report_created_at,
            updatedAt: row.report_updated_at,
        },
    };
}
/**
 * Lista todos os widgets ativos do dashboard de um usuário
 */
async function getActiveDashboardWidgets(userId) {
    const results = await (0, db_1.query)(`SELECT 
            w.id AS widget_id,
            w.user_id,
            w.report_id,
            w.position,
            w.expanded,
            w.active,
            w.created_at AS widget_created_at,
            w.updated_at AS widget_updated_at,
            r.id AS report_id,
            r.name AS report_name,
            r.source_table,
            r.visualization_type,
            r.config_json,
            r.created_by,
            r.is_public,
            r.created_at AS report_created_at,
            r.updated_at AS report_updated_at
         FROM dashboard_widgets w
         INNER JOIN reports r ON w.report_id = r.id
         WHERE w.active = TRUE AND w.user_id = ?
         ORDER BY w.position ASC`, [userId]);
    return results.map(row => ({
        id: row.widget_id,
        userId: row.user_id,
        reportId: row.report_id,
        position: row.position,
        expanded: row.expanded !== null && row.expanded !== undefined ? row.expanded : 0,
        active: Boolean(row.active),
        createdAt: row.widget_created_at,
        updatedAt: row.widget_updated_at,
        report: {
            id: row.report_id,
            name: row.report_name,
            sourceTable: row.source_table,
            visualizationType: row.visualization_type,
            configJson: parseConfigJson(row.config_json),
            createdBy: row.created_by,
            isPublic: Boolean(row.is_public),
            createdAt: row.report_created_at,
            updatedAt: row.report_updated_at,
        },
    }));
}
/**
 * Atualiza um widget
 */
async function updateDashboardWidget(id, dto, userId) {
    // Verificar se o widget existe e pertence ao usuário
    const existingWidget = await getDashboardWidgetById(id);
    if (!existingWidget) {
        throw new Error('Widget não encontrado');
    }
    if (existingWidget.userId !== userId) {
        throw new Error('Você não tem permissão para atualizar este widget');
    }
    const updates = [];
    const params = [];
    if (dto.position !== undefined) {
        updates.push('position = ?');
        params.push(dto.position);
    }
    if (dto.expanded !== undefined) {
        updates.push('expanded = ?');
        params.push(dto.expanded);
    }
    if (dto.active !== undefined) {
        updates.push('active = ?');
        params.push(dto.active ? 1 : 0);
    }
    if (updates.length === 0) {
        return existingWidget;
    }
    params.push(id, userId);
    await (0, db_1.query)(`UPDATE dashboard_widgets SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const updatedWidget = await getDashboardWidgetById(id);
    if (!updatedWidget) {
        throw new Error('Erro ao recuperar widget após atualização');
    }
    return updatedWidget;
}
/**
 * Deleta um widget
 */
async function deleteDashboardWidget(id, userId) {
    // Verificar se o widget existe e pertence ao usuário antes de deletar
    const widget = await getDashboardWidgetById(id);
    if (!widget) {
        throw new Error('Widget não encontrado');
    }
    // Verificar se o widget pertence ao usuário
    if (widget.userId !== userId) {
        throw new Error('Você não tem permissão para deletar este widget');
    }
    console.log(`[deleteDashboardWidget] Deletando widget ID: ${id}, Report ID: ${widget.reportId}, User ID: ${userId}`);
    // Usar pool.execute diretamente para obter o ResultSetHeader correto
    const connection = await db_1.pool.getConnection();
    try {
        const [result] = await connection.execute(`DELETE FROM dashboard_widgets WHERE id = ? AND user_id = ?`, [id, userId]);
        console.log(`[deleteDashboardWidget] Resultado completo:`, result);
        console.log(`[deleteDashboardWidget] Tipo do resultado:`, typeof result);
        console.log(`[deleteDashboardWidget] Constructor:`, result?.constructor?.name);
        console.log(`[deleteDashboardWidget] affectedRows:`, result?.affectedRows);
        console.log(`[deleteDashboardWidget] Linhas afetadas: ${result?.affectedRows || 0}`);
        const affectedRows = result?.affectedRows || 0;
        if (affectedRows === 0) {
            // Verificar se o widget ainda existe (pode ser que tenha sido deletado por outra operação)
            const [verifyResult] = await connection.execute(`SELECT id FROM dashboard_widgets WHERE id = ? AND user_id = ?`, [id, userId]);
            if (Array.isArray(verifyResult) && verifyResult.length > 0) {
                throw new Error('Falha ao deletar widget. O widget ainda existe no banco de dados.');
            }
            else {
                console.log(`[deleteDashboardWidget] Widget não existe mais (pode ter sido deletado por outra operação)`);
                return; // Widget já foi deletado, considerar sucesso
            }
        }
        // Verificar se realmente foi deletado
        const [verifyDeleted] = await connection.execute(`SELECT id FROM dashboard_widgets WHERE id = ? AND user_id = ?`, [id, userId]);
        if (Array.isArray(verifyDeleted) && verifyDeleted.length > 0) {
            throw new Error('Widget não foi deletado. Ainda existe no banco de dados.');
        }
        console.log(`[deleteDashboardWidget] Widget ${id} deletado com sucesso e verificado`);
    }
    finally {
        connection.release();
    }
}
/**
 * Obtém os campos disponíveis para uma tabela
 */
function getAvailableFields(table) {
    const relatedTables = [];
    // Buscar todas as tabelas relacionadas possíveis
    for (const [key, relationship] of Object.entries(TABLE_RELATIONSHIPS)) {
        if (key.startsWith(`${table}.`)) {
            const relatedTableName = relationship.alias;
            const fields = RELATED_TABLE_FIELDS[relatedTableName] || [];
            relatedTables.push({
                key: key.replace(`${table}.`, ''),
                table: relationship.table,
                alias: relationship.alias,
                fields,
            });
        }
    }
    return {
        dimensions: ALLOWED_FIELDS[table],
        metrics: NUMERIC_FIELDS[table],
        relatedTables,
    };
}
exports.reportService = {
    createReport,
    updateReport,
    getReportById,
    getAllReports,
    getAvailableReportsForUser,
    deleteReport,
    executeReport,
    executeReportConfig,
    createDashboardWidget,
    getDashboardWidgetById,
    getActiveDashboardWidgets,
    updateDashboardWidget,
    deleteDashboardWidget,
    getAvailableFields,
};
