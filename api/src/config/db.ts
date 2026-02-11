import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env apenas se existir (opcional)
// Em produção com Docker, as variáveis já são injetadas via env_file do docker-compose
import fs from 'fs';

const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
dotenv.config({ path: envPath });
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
export const pool = mysql.createPool(dbConfig);

// Função para verificar conexão
export const checkDatabaseConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
};

// Função helper para executar queries
export const query = async (sql: string, params?: any[]) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
};

export default pool;
