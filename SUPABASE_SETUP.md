# Configuração do Supabase Local

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env` dentro da pasta `fts/` com as seguintes variáveis:

```env
# JWT Secret (usado para assinar tokens)
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# PostgreSQL Password
POSTGRES_PASSWORD=postgres

# Supabase Keys (Padrão do Supabase Local)
# ANON_KEY: Chave pública (pode ser usada no frontend)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# SERVICE_KEY: Chave privada (apenas no backend, nunca no frontend!)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Supabase URL (quando rodando localmente)
SUPABASE_URL=http://localhost:8000

# Porta da API Backend
PORT=5000

# Ambiente
NODE_ENV=development
```

## Como Rodar

1. **Criar o arquivo `.env`** dentro da pasta `fts/` com as variáveis acima
2. **Instalar dependências do backend:**
   ```bash
   cd fts/api
   npm install
   ```
3. **Subir os serviços:**
   ```bash
   cd fts
   docker-compose up --build
   ```

## Serviços Disponíveis

- **Supabase Studio**: http://localhost:54323 (Interface web)
- **Kong API Gateway**: http://localhost:8000
- **PostgREST (REST API)**: http://localhost:3000
- **Realtime**: http://localhost:4000
- **Storage**: http://localhost:5002
- **Backend API**: http://localhost:5001

## Endpoints

- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter dados do usuário autenticado
