"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
// Carregar .env apenas se existir (opcional)
// Em produção com Docker, as variáveis já são injetadas via env_file do docker-compose
// Tentar carregar apenas para desenvolvimento local
const envPath = path_1.default.resolve(__dirname, '../../../.env');
if (fs_1.default.existsSync(envPath)) {
    dotenv_1.default.config({ path: envPath });
    console.log(`✅ Loaded .env from: ${envPath}`);
}
else {
    // Em produção, usar apenas variáveis de ambiente do Docker (já injetadas)
    // Não precisa avisar, é o comportamento esperado
}
const PORT = process.env.PORT || 5000;
// Verificar conexão com banco antes de iniciar servidor
(0, db_1.checkDatabaseConnection)().then((connected) => {
    if (connected) {
        // Escutar em 0.0.0.0 para aceitar conexões de qualquer interface de rede
        app_1.default.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
            console.log(`Server accessible at http://0.0.0.0:${PORT}`);
        });
    }
    else {
        console.error('Failed to connect to database. Server not started.');
        process.exit(1);
    }
});
