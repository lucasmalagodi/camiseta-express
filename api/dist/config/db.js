"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.checkDatabaseConnection = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Carregar .env apenas se existir (opcional)
// Em produção com Docker, as variáveis já são injetadas via env_file do docker-compose
const fs_1 = __importDefault(require("fs"));
const envPath = path_1.default.resolve(__dirname, '../../../.env');
if (fs_1.default.existsSync(envPath)) {
    dotenv_1.default.config({ path: envPath });
}
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ftsancd',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};
// Pool de conexões
exports.pool = promise_1.default.createPool(dbConfig);
// Função para verificar conexão
const checkDatabaseConnection = async () => {
    try {
        const connection = await exports.pool.getConnection();
        console.log('MySQL connected successfully');
        connection.release();
        return true;
    }
    catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
};
exports.checkDatabaseConnection = checkDatabaseConnection;
// Função helper para executar queries
const query = async (sql, params) => {
    try {
        const [results] = await exports.pool.execute(sql, params);
        return results;
    }
    catch (error) {
        console.error('Query error:', error);
        throw error;
    }
};
exports.query = query;
exports.default = exports.pool;
