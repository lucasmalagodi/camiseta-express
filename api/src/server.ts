import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import app from './app';
import { checkDatabaseConnection } from './config/db';

// Carregar .env apenas se existir (opcional)
// Em produção com Docker, as variáveis já são injetadas via env_file do docker-compose
// Tentar carregar apenas para desenvolvimento local
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
dotenv.config({ path: envPath });
    console.log(`✅ Loaded .env from: ${envPath}`);
} else {
    // Em produção, usar apenas variáveis de ambiente do Docker (já injetadas)
    // Não precisa avisar, é o comportamento esperado
}

const PORT = process.env.PORT || 5000;

// Verificar conexão com banco antes de iniciar servidor
checkDatabaseConnection().then((connected) => {
    if (connected) {
        // Escutar em 0.0.0.0 para aceitar conexões de qualquer interface de rede
        app.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
            console.log(`Server accessible at http://0.0.0.0:${PORT}`);
        });
    } else {
        console.error('Failed to connect to database. Server not started.');
        process.exit(1);
    }
});
