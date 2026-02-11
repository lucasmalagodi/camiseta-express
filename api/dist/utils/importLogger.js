"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importLogger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ImportLogger {
    constructor() {
        // Determinar diretório de logs
        const possibleLogsPaths = [
            '/src/logs', // Docker/produção
            path_1.default.resolve(__dirname, '../../logs'), // Desenvolvimento (do dist)
            path_1.default.resolve(__dirname, '../../../logs'), // Desenvolvimento (do src)
        ];
        this.logsDir = possibleLogsPaths.find(p => {
            try {
                if (!fs_1.default.existsSync(p)) {
                    fs_1.default.mkdirSync(p, { recursive: true });
                }
                return true;
            }
            catch {
                return false;
            }
        }) || possibleLogsPaths[0];
        // Garantir que o diretório existe
        if (!fs_1.default.existsSync(this.logsDir)) {
            fs_1.default.mkdirSync(this.logsDir, { recursive: true });
        }
        console.log(`📝 Import Logger inicializado. Diretório de logs: ${this.logsDir}`);
    }
    /**
     * Obtém o caminho do arquivo de log para uma data específica
     */
    getLogFilePath(date = new Date()) {
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `import-errors-${dateStr}.log`;
        return path_1.default.join(this.logsDir, filename);
    }
    /**
     * Grava uma entrada de log
     */
    writeLog(entry) {
        try {
            const logFilePath = this.getLogFilePath();
            const logLine = this.formatLogEntry(entry);
            // Append ao arquivo
            fs_1.default.appendFileSync(logFilePath, logLine + '\n', 'utf8');
        }
        catch (error) {
            // Se falhar ao escrever no arquivo, pelo menos logar no console
            console.error('❌ Erro ao gravar log de importação:', error);
            console.error('📝 Entrada de log que falhou:', entry);
        }
    }
    /**
     * Formata uma entrada de log como JSON (uma linha por entrada)
     */
    formatLogEntry(entry) {
        return JSON.stringify(entry);
    }
    /**
     * Log de erro durante processamento de importação
     */
    logError(importId, message, error, context, category) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            importId,
            level: 'ERROR',
            message,
            category: category || this.inferCategory(message, context),
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined,
            context
        };
        this.writeLog(logEntry);
        console.error(`❌ [Import ${importId}] ${message}`, error || '');
    }
    /**
     * Log de aviso durante processamento
     */
    logWarning(importId, message, context, category) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            importId,
            level: 'WARN',
            message,
            category: category || this.inferCategory(message, context),
            context
        };
        this.writeLog(logEntry);
        console.warn(`⚠️  [Import ${importId}] ${message}`);
    }
    /**
     * Log de informação durante processamento
     */
    logInfo(importId, message, context, category) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            importId,
            level: 'INFO',
            message,
            category: category || 'OUTROS',
            context
        };
        this.writeLog(logEntry);
        console.log(`ℹ️  [Import ${importId}] ${message}`);
    }
    /**
     * Infere a categoria do log baseado na mensagem e contexto
     */
    inferCategory(message, context) {
        const msgLower = message.toLowerCase();
        const reason = context?.reason?.toLowerCase() || '';
        // Duplicata
        if (msgLower.includes('duplicat') || reason.includes('duplicat') || context?.reason === 'Duplicata') {
            return 'DUPLICATA';
        }
        // Pontuação
        if (msgLower.includes('pontuação') || msgLower.includes('pontos') ||
            msgLower.includes('pontuação é 0') || msgLower.includes('pontos inválidos') ||
            reason.includes('pontos') || reason.includes('pontuação')) {
            return 'PONTUACAO';
        }
        // Data inválida
        if (msgLower.includes('data') && (msgLower.includes('inválid') || msgLower.includes('ausente'))) {
            return 'DATA_INVALIDA';
        }
        // Promotor ausente
        if (msgLower.includes('promotor') && (msgLower.includes('ausente') || msgLower.includes('vazio'))) {
            return 'PROMOTOR_AUSENTE';
        }
        // Inserção
        if (msgLower.includes('inserir') || msgLower.includes('inserção') || reason.includes('inserção')) {
            return 'INSERCAO';
        }
        // Validação
        if (msgLower.includes('validação') || msgLower.includes('inválid') || reason.includes('validação')) {
            return 'VALIDACAO';
        }
        return 'OUTROS';
    }
    /**
     * Log de erro de linha específica durante processamento
     */
    logRowError(importId, rowNumber, reason, rowData) {
        this.logError(importId, `Erro na linha ${rowNumber}: ${reason}`, undefined, {
            rowNumber,
            reason,
            rowData: rowData ? this.sanitizeRowData(rowData) : undefined
        });
    }
    /**
     * Sanitiza dados da linha para evitar logs muito grandes
     */
    sanitizeRowData(rowData) {
        if (!rowData)
            return undefined;
        // Limitar tamanho de strings e remover dados sensíveis se necessário
        const sanitized = {};
        for (const [key, value] of Object.entries(rowData)) {
            if (typeof value === 'string' && value.length > 200) {
                sanitized[key] = value.substring(0, 200) + '...';
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Lê logs de uma data específica
     */
    readLogs(date = new Date()) {
        try {
            const logFilePath = this.getLogFilePath(date);
            if (!fs_1.default.existsSync(logFilePath)) {
                return [];
            }
            const content = fs_1.default.readFileSync(logFilePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            return lines.map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            }).filter((entry) => entry !== null);
        }
        catch (error) {
            console.error('Erro ao ler logs:', error);
            return [];
        }
    }
    /**
     * Lê logs de uma importação específica
     */
    readImportLogs(importId, date, category) {
        const allLogs = this.readLogs(date);
        let filtered = allLogs.filter(entry => entry.importId === importId);
        if (category) {
            filtered = filtered.filter(entry => entry.category === category);
        }
        return filtered;
    }
}
// Singleton instance
exports.importLogger = new ImportLogger();
