import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { CreateAgencyPointsImportItemDto } from '../types';

export interface ProcessedRow {
    rowNumber: number;
    data: CreateAgencyPointsImportItemDto | null;
    error: string | null;
}

export interface SpreadsheetProcessResult {
    rows: ProcessedRow[];
    totalRows: number;
    validRows: number;
    errorRows: number;
}

// Mapeamento de colunas da planilha (chave) para campos do banco (valor)
// Suporta variações comuns nos nomes das colunas
const COLUMN_MAPPING: Record<string, keyof CreateAgencyPointsImportItemDto> = {
    'data': 'saleDate',
    'DATA': 'saleDate', // Suportar maiúsculas
    'vendaid': 'saleId',
    'venda id': 'saleId', // Variação com espaço
    'cnpjcpf': 'cnpj',
    'cnpj/cpf': 'cnpj', // Variação com barra
    'agencia': 'agencyName',
    'agência': 'agencyName', // Variação com acento
    'posto': 'store',
    'filial': 'branch',
    'promotor': 'executiveName',
    'fornecedor': 'supplier',
    'produto': 'productName',
    'empresa': 'company',
    'pontos': 'points'
};

// Função para normalizar nome de coluna para comparação
function normalizeColumnName(name: string): string {
    return name.toLowerCase()
        .trim()
        .replace(/\s+/g, '') // Remove espaços
        .replace(/[\/\-_]/g, '') // Remove barras, hífens, underscores
        .replace(/[àáâãäå]/g, 'a') // Remove acentos
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c');
}

/**
 * Normaliza valor de pontos: converte vírgula para ponto e valida
 */
function normalizePoints(value: any): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    // Converter para string
    let strValue = String(value).trim();

    // Remover espaços
    strValue = strValue.replace(/\s/g, '');

    // Substituir vírgula por ponto
    strValue = strValue.replace(',', '.');

    // Tentar parsear como número
    const numValue = parseFloat(strValue);

    if (isNaN(numValue)) {
        return null;
    }

    // Permitir 0 (será logado como aviso no processamento)
    // Apenas rejeitar valores negativos
    if (numValue < 0) {
        return null;
    }

    return numValue;
}

/**
 * Normaliza data: parsing explícito de datas Excel e strings DD/MM/YY ou DD/MM/YYYY
 * Retorna ISO string (YYYY-MM-DD) ou null se inválida
 * 
 * NÃO usa Date.parse ou construtor implícito de Date
 * Faz parsing explícito conforme especificação
 */
function normalizeDate(value: any): string | null {
    // Tratar valores nulos, undefined, vazios
    if (value === null || value === undefined || value === '') {
        return null;
    }
    
    // Tratar string "null" ou "undefined"
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
            return null;
        }
    }
    
    // Tratar objetos vazios {} (comum em Excel quando célula está vazia)
    if (typeof value === 'object' && value !== null) {
        // Se for objeto Date, validar e converter
        if (value instanceof Date) {
            if (isNaN(value.getTime())) {
                return null;
            }
            return value.toISOString().split('T')[0];
        }
        // Se for objeto vazio, retornar null
        if (Object.keys(value).length === 0) {
            return null;
        }
        // Outros objetos não são datas válidas
        return null;
    }

    // 1. PARSEAR NÚMERO SERIAL DO EXCEL
    // Excel armazena datas como número de dias desde 1900-01-01
    // Nota: Excel tem um bug conhecido - considera 1900 como ano bissexto
    // Para datas após 1900-02-28, subtrair 1 dia
    if (typeof value === 'number') {
        try {
            // Excel epoch: 1900-01-01 (mas Excel conta como se 1900 fosse bissexto)
            // Para corrigir: datas >= 60 (1900-03-01) precisam subtrair 1
            let excelDays = value;
            if (excelDays >= 60) {
                excelDays = excelDays - 1;
            }
            
            // Converter para milissegundos desde 1900-01-01
            // 1900-01-01 em JS Date é new Date(1900, 0, 1)
            const excelEpoch = new Date(1900, 0, 1); // 0-based month (janeiro = 0)
            const milliseconds = excelEpoch.getTime() + (excelDays - 1) * 24 * 60 * 60 * 1000;
            
            // Criar Date explicitamente
            const date = new Date(milliseconds);
            
            // Validar se a data é válida
            if (isNaN(date.getTime())) {
                return null;
            }
            
            // Retornar no formato YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // +1 porque month é 0-based
            const day = String(date.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        } catch (error) {
            return null;
        }
    }

    // 2. PARSEAR STRING - Suporta múltiplos formatos de data
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;

        // Remover hora se presente (DD/MM/YYYY HH:MM:SS ou DD/MM/YYYY HH:MM)
        // Extrair apenas a parte da data
        let datePart = trimmed;
        const spaceIndex = trimmed.indexOf(' ');
        if (spaceIndex !== -1) {
            datePart = trimmed.substring(0, spaceIndex);
        }

        // Função auxiliar para tentar parsear data com diferentes interpretações
        const tryParseDate = (part1: number, part2: number, part3: number): string | null => {
            // Tentar DD/MM/YYYY primeiro (formato brasileiro)
            if (part1 >= 1 && part1 <= 31 && part2 >= 1 && part2 <= 12) {
                const date = new Date(part3, part2 - 1, part1);
                if (date.getFullYear() === part3 && 
                    date.getMonth() === (part2 - 1) && 
                    date.getDate() === part1 &&
                    !isNaN(date.getTime())) {
                    return `${part3}-${String(part2).padStart(2, '0')}-${String(part1).padStart(2, '0')}`;
                }
            }
            
            // Tentar MM/DD/YYYY (formato americano)
            if (part2 >= 1 && part2 <= 31 && part1 >= 1 && part1 <= 12) {
                const date = new Date(part3, part1 - 1, part2);
                if (date.getFullYear() === part3 && 
                    date.getMonth() === (part1 - 1) && 
                    date.getDate() === part2 &&
                    !isNaN(date.getTime())) {
                    return `${part3}-${String(part1).padStart(2, '0')}-${String(part2).padStart(2, '0')}`;
                }
            }
            
            return null;
        };

        // Regex flexível: aceita 1-2 dígitos para dia/mês e 2-4 dígitos para ano
        // Formatos suportados:
        // - D/M/YY, D/M/YYYY
        // - DD/MM/YY, DD/MM/YYYY
        // - M/D/YY, M/D/YYYY
        // - MM/DD/YY, MM/DD/YYYY
        const flexibleMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (flexibleMatch) {
            try {
                const [, part1Str, part2Str, part3Str] = flexibleMatch;
                const part1 = parseInt(part1Str, 10);
                const part2 = parseInt(part2Str, 10);
                let part3 = parseInt(part3Str, 10);
                
                // Converter ano de 2 dígitos para 4 dígitos (20XX)
                if (part3 < 100) {
                    part3 = 2000 + part3;
                }
                
                // Validar valores básicos
                if (part1 < 1 || part1 > 31 || part2 < 1 || part2 > 31 || part3 < 1900 || part3 > 2100) {
                    return null;
                }
                
                // Tentar parsear como DD/MM/YYYY primeiro (formato brasileiro mais comum)
                // Se part1 > 12, provavelmente é dia (DD/MM)
                // Se part2 > 12, provavelmente é mês (MM/DD)
                let result: string | null = null;
                
                if (part1 > 12 && part2 <= 12) {
                    // Claramente DD/MM (dia > 12, mês <= 12)
                    const date = new Date(part3, part2 - 1, part1);
                    if (date.getFullYear() === part3 && 
                        date.getMonth() === (part2 - 1) && 
                        date.getDate() === part1 &&
                        !isNaN(date.getTime())) {
                        result = `${part3}-${String(part2).padStart(2, '0')}-${String(part1).padStart(2, '0')}`;
                    }
                } else if (part2 > 12 && part1 <= 12) {
                    // Claramente MM/DD (mês > 12 seria inválido, então part2 deve ser dia)
                    const date = new Date(part3, part1 - 1, part2);
                    if (date.getFullYear() === part3 && 
                        date.getMonth() === (part1 - 1) && 
                        date.getDate() === part2 &&
                        !isNaN(date.getTime())) {
                        result = `${part3}-${String(part1).padStart(2, '0')}-${String(part2).padStart(2, '0')}`;
                    }
                } else {
                    // Ambíguo (ambos <= 12), tentar ambos os formatos
                    // Priorizar DD/MM/YYYY (formato brasileiro)
                    result = tryParseDate(part1, part2, part3);
                    if (!result) {
                        // Se DD/MM falhar, tentar MM/DD
                        result = tryParseDate(part2, part1, part3);
                    }
                }
                
                return result;
            } catch (error) {
                return null;
            }
        }

        // Se não encontrou nenhum formato válido, retornar null
        return null;
    }

    // Se chegou aqui, o tipo não é suportado
    return null;
}

/**
 * Normaliza string: remove espaços e retorna null se vazio
 */
function normalizeString(value: any): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    const str = String(value).trim();
    return str === '' ? null : str;
}

/**
 * Processa arquivo de planilha e retorna dados mapeados
 */
export async function processSpreadsheet(filePath: string): Promise<SpreadsheetProcessResult> {
    const rows: ProcessedRow[] = [];

    try {
        // Ler arquivo
        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo não encontrado: ${filePath}`);
        }

        console.log(`📄 Processando planilha: ${filePath}`);
        
        // Ler planilha
        const workbook = XLSX.readFile(filePath, { type: 'buffer' });
        
        // Pegar primeira planilha
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error('Planilha vazia ou sem abas');
        }

        const worksheet = workbook.Sheets[sheetName];
        
        // Converter para JSON (mantendo cabeçalhos)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, // Array de arrays
            defval: null,
            raw: false // Processar valores
        }) as any[][];

        if (jsonData.length === 0) {
            throw new Error('Planilha vazia');
        }

        // Procurar linha de cabeçalhos (pode não ser a primeira linha)
        // Cabeçalhos geralmente estão na linha 4 (índice 3)
        const expectedColumnNames = ['cnpjcpf', 'promotor', 'pontos', 'data', 'DATA', 'vendaid', 'agencia', 'agência', 'posto', 'filial', 'fornecedor', 'produto', 'empresa'];
        let headerRowIndex = -1;
        let headers: string[] = [];

        // Primeiro, tentar linha 4 especificamente (índice 3) - formato mais comum
        if (jsonData.length > 3) {
            const row4 = jsonData[3] || [];
            const row4Headers = row4.map((h: any) => String(h || '').trim().toLowerCase());
            
            // Verificar se linha 4 contém pelo menos uma coluna esperada
            const hasExpectedColumn = expectedColumnNames.some(expectedCol => {
                const normalizedExpected = normalizeColumnName(expectedCol);
                return row4Headers.some(h => {
                    const normalizedHeader = normalizeColumnName(h);
                    return normalizedHeader === normalizedExpected;
                });
            });

            if (hasExpectedColumn) {
                headerRowIndex = 3;
                headers = row4Headers;
                console.log(`📋 Cabeçalhos encontrados na linha 4 (índice 3):`);
                headers.forEach((h, idx) => {
                    if (h) { // Só mostrar colunas não vazias
                        console.log(`   [${idx}] "${h}"`);
                    }
                });
            }
        }

        // Se linha 4 não funcionou, procurar nas primeiras 10 linhas
        if (headerRowIndex === -1) {
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i] || [];
                const rowHeaders = row.map((h: any) => String(h || '').trim().toLowerCase());
                
                // Verificar se esta linha contém pelo menos uma coluna esperada
                const hasExpectedColumn = expectedColumnNames.some(expectedCol => {
                    const normalizedExpected = normalizeColumnName(expectedCol);
                    return rowHeaders.some(h => {
                        const normalizedHeader = normalizeColumnName(h);
                        return normalizedHeader === normalizedExpected;
                    });
                });

                if (hasExpectedColumn) {
                    headerRowIndex = i;
                    headers = rowHeaders;
                    console.log(`📋 Cabeçalhos encontrados na linha ${i + 1} (índice ${i}):`);
                    headers.forEach((h, idx) => {
                        if (h) { // Só mostrar colunas não vazias
                            console.log(`   [${idx}] "${h}"`);
                        }
                    });
                    break;
                }
            }
        }

        // Se ainda não encontrou, usar primeira linha mesmo
        if (headerRowIndex === -1) {
            console.log('⚠️  Não encontrou linha de cabeçalhos esperada, usando primeira linha');
            headers = (jsonData[0] || []).map((h: any) => 
                String(h || '').trim().toLowerCase()
            );
            headerRowIndex = 0;
            console.log(`📋 Usando primeira linha como cabeçalhos (${headers.length} colunas):`);
            headers.forEach((h, i) => {
                if (h) { // Só mostrar colunas não vazias
                    console.log(`   [${i}] "${h}"`);
                }
            });
        }

        // Encontrar índices das colunas
        // COLUMN_MAPPING: chave = nome da coluna na planilha, valor = campo no banco
        const columnIndices: Record<keyof CreateAgencyPointsImportItemDto, number> = {} as any;
        
        // Log detalhado dos cabeçalhos (já normalizados para minúscula)
        console.log(`🔍 Buscando colunas. Cabeçalhos (${headers.length} colunas):`);
        headers.forEach((h, i) => {
            if (h) { // Só mostrar colunas não vazias
                console.log(`   [${i}] "${h}"`);
            }
        });
        
        // Primeiro, tentar match exato (case-insensitive) e depois normalizado
        // IMPORTANTE: headers já estão em minúscula, então comparar diretamente
        for (const [spreadsheetColumn, dbField] of Object.entries(COLUMN_MAPPING)) {
            // Se já encontrou este campo, pular (evitar sobrescrever)
            if (dbField in columnIndices) continue;
            
            // Normalizar a coluna esperada para minúscula (já que headers estão em minúscula)
            const normalizedColumn = spreadsheetColumn.toLowerCase().trim();
            
            // Tentar match exato primeiro (headers já estão em minúscula)
            let index = headers.findIndex(h => {
                const hTrimmed = String(h).trim();
                return hTrimmed === normalizedColumn;
            });
            
            // Se não encontrou, tentar match normalizado (remove espaços, acentos, etc)
            if (index === -1) {
                const normalizedExpected = normalizeColumnName(spreadsheetColumn);
                index = headers.findIndex(h => {
                    const normalizedHeader = normalizeColumnName(String(h));
                    return normalizedHeader === normalizedExpected;
                });
            }
            
            if (index !== -1) {
                columnIndices[dbField] = index;
                console.log(`✅ Coluna "${spreadsheetColumn}" (planilha) → "${dbField}" (banco) no índice ${index} (cabeçalho: "${headers[index]}")`);
            } else if (dbField === 'saleDate') {
                // Log detalhado para debug da coluna de data
                console.log(`⚠️  Coluna de data não encontrada. Procurando por: "${spreadsheetColumn}"`);
                console.log(`   Tentando busca flexível...`);
                // Tentar encontrar qualquer variação de "data" (mais flexível)
                // Como headers já estão em minúscula, procurar por "data" diretamente
                let dataIndex = headers.findIndex(h => {
                    const hStr = String(h).trim();
                    const normalizedH = normalizeColumnName(hStr);
                    // Procurar por "data" exato ou que contenha "data"
                    return hStr === 'data' || 
                           hStr.includes('data') || 
                           normalizedH === 'data' ||
                           normalizedH.includes('data');
                });
                
                // Se ainda não encontrou e a primeira coluna existe, verificar se é "data"
                if (dataIndex === -1 && headers.length > 0) {
                    const firstCol = String(headers[0] || '').trim();
                    console.log(`   Verificando primeira coluna (índice 0): "${firstCol}"`);
                    if (firstCol === 'data' || normalizeColumnName(firstCol) === 'data') {
                        dataIndex = 0;
                        console.log(`   ✅ Primeira coluna é "data"!`);
                    }
                }
                
                if (dataIndex !== -1) {
                    columnIndices[dbField] = dataIndex;
                    console.log(`✅ Coluna de data encontrada no índice ${dataIndex}: "${headers[dataIndex]}"`);
                } else {
                    console.log(`❌ Coluna de data NÃO encontrada mesmo com busca flexível`);
                    console.log(`   Primeira coluna (índice 0): "${headers[0] || 'VAZIA'}"`);
                    console.log(`   Todas as colunas: ${headers.map((h, i) => `[${i}]"${h}"`).join(', ')}`);
                }
            }
        }
        
        // Log de colunas não encontradas (apenas obrigatórias)
        const requiredFields: (keyof CreateAgencyPointsImportItemDto)[] = ['cnpj', 'points'];
        for (const field of requiredFields) {
            if (!(field in columnIndices)) {
                const expectedColumns = Object.entries(COLUMN_MAPPING)
                    .filter(([_, dbField]) => dbField === field)
                    .map(([spreadsheetCol]) => spreadsheetCol);
                console.log(`❌ Campo "${field}" não encontrado. Esperado uma dessas colunas: ${expectedColumns.join(', ')}`);
            }
        }
        
        // Log de coluna opcional (promotor) não encontrada
        if (!('executiveName' in columnIndices)) {
            console.log(`⚠️  Coluna "promotor" não encontrada. Linhas sem promotor usarão "Sem Promotor" como padrão.`);
        }
        
        // Log resumo das colunas encontradas
        console.log(`📊 Resumo de colunas mapeadas:`, Object.entries(columnIndices).map(([field, index]) => 
            `${field}=[${index}]"${headers[index] || 'N/A'}"`
        ).join(', '));
        
        // Verificar especificamente se saleDate foi encontrado
        if (!('saleDate' in columnIndices)) {
            console.log(`❌ ATENÇÃO: Coluna saleDate NÃO foi encontrada!`);
            console.log(`   Procurando por: "data" ou "DATA"`);
            console.log(`   Cabeçalhos disponíveis: ${headers.map((h, i) => `[${i}]"${h}"`).join(', ')}`);
        } else {
            console.log(`✅ Coluna saleDate encontrada no índice ${columnIndices['saleDate']}: "${headers[columnIndices['saleDate']]}"`);
        }

        // Validar colunas obrigatórias (verificar se os campos do banco foram encontrados)
        // As colunas obrigatórias são: cnpjcpf -> cnpj, pontos -> points
        // Promotor não é mais obrigatório (será "Sem Promotor" se ausente)
        const requiredSpreadsheetColumns = ['cnpjcpf', 'pontos'];
        const requiredDbFields: (keyof CreateAgencyPointsImportItemDto)[] = ['cnpj', 'points'];
        
        const missingFields = requiredDbFields.filter(field => !(field in columnIndices));
        if (missingFields.length > 0) {
            // Mapear campos do banco de volta para nomes de colunas da planilha para mensagem de erro
            const missingColumns = missingFields.map(field => {
                const spreadsheetCol = Object.entries(COLUMN_MAPPING).find(([_, dbField]) => dbField === field)?.[0];
                return spreadsheetCol || field;
            });
            
            // Mostrar quais colunas da planilha estão faltando e quais foram encontradas
            const foundHeaders = headers.join(', ');
            const foundColumns = Object.entries(COLUMN_MAPPING)
                .filter(([spreadsheetCol, dbField]) => dbField in columnIndices)
                .map(([spreadsheetCol]) => spreadsheetCol);
            
            throw new Error(
                `Colunas obrigatórias não encontradas na planilha: ${missingColumns.join(', ')}. ` +
                `Colunas encontradas: ${foundColumns.join(', ') || 'nenhuma'}. ` +
                `Cabeçalhos na planilha: ${foundHeaders}`
            );
        }

        // Processar linhas (começando após a linha de cabeçalhos)
        const dataStartRow = headerRowIndex + 1;
        for (let i = dataStartRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            const rowNumber = i + 1; // Linha real na planilha (1-indexed)

            try {
                // Verificar se a linha não está vazia
                if (!row || row.length === 0 || row.every((cell: any) => cell === null || cell === undefined || cell === '')) {
                    continue; // Pular linhas vazias
                }

                // Extrair valores das colunas usando os campos do banco como chave
                const cnpjIndex = columnIndices['cnpj'];
                const executiveNameIndex = columnIndices['executiveName']; // Opcional
                const pointsIndex = columnIndices['points'];
                
                if (cnpjIndex === undefined || pointsIndex === undefined) {
                    rows.push({
                        rowNumber,
                        data: null,
                        error: 'Índices de colunas obrigatórias não encontrados'
                    });
                    continue;
                }

                const cnpj = normalizeString(row[cnpjIndex]);
                // Promotor é opcional - se não encontrar índice ou valor vazio, usar "Sem Promotor"
                const executiveNameRaw = executiveNameIndex !== undefined 
                    ? normalizeString(row[executiveNameIndex]) 
                    : null;
                let executiveName = executiveNameRaw && executiveNameRaw.trim() !== '' 
                    ? executiveNameRaw 
                    : 'Sem Promotor';
                const points = normalizePoints(row[pointsIndex]);

                // Validações obrigatórias
                if (!cnpj) {
                    rows.push({
                        rowNumber,
                        data: null,
                        error: 'CNPJ/CPF é obrigatório'
                    });
                    continue;
                }

                // executiveName já foi definido acima como 'Sem Promotor' se ausente
                // Não precisa verificar novamente aqui

                // Verificar pontos null ou undefined (rejeitar)
                if (points === null || points === undefined) {
                    rows.push({
                        rowNumber,
                        data: null,
                        error: 'Pontos inválidos ou ausentes'
                    });
                    continue;
                }

                // Pontos 0 será processado mas logado como aviso no service

                // Construir objeto de dados usando os campos do banco como chave
                const saleDateIndex = columnIndices['saleDate'];
                let saleDateRaw: any = undefined;
                if (saleDateIndex !== undefined && saleDateIndex < row.length) {
                    saleDateRaw = row[saleDateIndex];
                    
                    // Tratar objetos vazios {} primeiro (comum em Excel quando célula está vazia)
                    if (typeof saleDateRaw === 'object' && saleDateRaw !== null && !(saleDateRaw instanceof Date)) {
                        // Verificar se é objeto vazio
                        try {
                            const keys = Object.keys(saleDateRaw);
                            if (keys.length === 0) {
                                saleDateRaw = null;
                            } else {
                                // Tentar converter para string se tiver propriedades
                                const objStr = JSON.stringify(saleDateRaw);
                                if (objStr === '{}' || objStr === '[]') {
                                    saleDateRaw = null;
                                }
                            }
                        } catch (e) {
                            // Se não conseguir verificar, tratar como null
                            saleDateRaw = null;
                        }
                    }
                    
                    // Tratar valores vazios, null, undefined ou string "null"
                    if (saleDateRaw === null || saleDateRaw === undefined || 
                        saleDateRaw === '' || 
                        (typeof saleDateRaw === 'string' && (saleDateRaw.toLowerCase().trim() === 'null' || saleDateRaw.trim() === ''))) {
                        saleDateRaw = null;
                    }
                } else if (saleDateIndex === undefined) {
                    // Log apenas nas primeiras linhas para não poluir
                    if (rowNumber <= 5) {
                        console.log(`⚠️  Linha ${rowNumber}: Coluna saleDate não encontrada! Cabeçalhos: ${headers.join(', ')}`);
                        console.log(`   columnIndices disponíveis:`, Object.keys(columnIndices));
                    }
                }
                
                // Normalizar data - parsing explícito
                const saleDate = saleDateRaw !== null && saleDateRaw !== undefined ? normalizeDate(saleDateRaw) : null;
                
                // VALIDAÇÃO OBRIGATÓRIA: sale_date é REQUIRED
                // Se a data for inválida ou ausente, rejeitar a linha
                if (!saleDate) {
                    rows.push({
                        rowNumber,
                        data: null,
                        error: `Data de venda inválida ou ausente na coluna DATA. Valor: ${saleDateRaw !== null && saleDateRaw !== undefined ? JSON.stringify(saleDateRaw) : 'ausente'}`
                    });
                    continue;
                }
                
                // Log de debug para data (apenas primeiras 10 linhas)
                if (rowNumber <= 10) {
                    console.log(`📅 Linha ${rowNumber}: saleDateIndex=${saleDateIndex}, raw="${saleDateRaw}", tipo=${typeof saleDateRaw}, normalizada="${saleDate}"`);
                }
                
                const item: CreateAgencyPointsImportItemDto = {
                    saleId: columnIndices['saleId'] !== undefined ? normalizeString(row[columnIndices['saleId']]) : null,
                    saleDate: saleDate, // Já normalizado como 'YYYY-MM-DD' (nunca null aqui)
                    cnpj: cnpj,
                    agencyName: columnIndices['agencyName'] !== undefined ? normalizeString(row[columnIndices['agencyName']]) : null,
                    branch: columnIndices['branch'] !== undefined ? normalizeString(row[columnIndices['branch']]) : null,
                    store: columnIndices['store'] !== undefined ? normalizeString(row[columnIndices['store']]) : null,
                    executiveName: executiveName,
                    supplier: columnIndices['supplier'] !== undefined ? normalizeString(row[columnIndices['supplier']]) : null,
                    productName: columnIndices['productName'] !== undefined ? normalizeString(row[columnIndices['productName']]) : null,
                    company: columnIndices['company'] !== undefined ? normalizeString(row[columnIndices['company']]) : null,
                    points: points
                };

                rows.push({
                    rowNumber,
                    data: item,
                    error: null
                });

            } catch (error) {
                rows.push({
                    rowNumber,
                    data: null,
                    error: error instanceof Error ? error.message : 'Erro desconhecido ao processar linha'
                });
            }
        }

        const validRows = rows.filter(r => r.data !== null).length;
        const errorRows = rows.filter(r => r.error !== null).length;

        return {
            rows,
            totalRows: rows.length,
            validRows,
            errorRows
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('❌ Erro ao processar planilha:', errorMessage);
        if (errorStack) {
            console.error('Stack trace:', errorStack);
        }
        throw new Error(`Erro ao processar planilha: ${errorMessage}`);
    }
}
