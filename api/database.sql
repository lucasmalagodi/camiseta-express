-- Este arquivo é apenas para referência
-- As tabelas são criadas automaticamente pelo supabase/init.sql
-- que é executado quando o container PostgreSQL inicia

-- Extensões necessárias (já no init.sql)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários (já no init.sql)
-- CREATE TABLE IF NOT EXISTS public.users (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     role VARCHAR(50) DEFAULT 'user',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
