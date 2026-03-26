/**
 * URL pública do frontend (links em e-mails: recuperação de senha, pedidos, tickets).
 * Prioridade: FRONTEND_URL no .env → em development localhost → produção ftravelseries.com.br
 */
const PRODUCTION_FRONTEND_URL = 'https://ftravelseries.com.br';
const DEV_FRONTEND_URL = 'http://localhost:5173';

export function getPublicFrontendUrl(): string {
    const fromEnv = process.env.FRONTEND_URL?.trim().replace(/\/+$/, '');
    if (fromEnv) return fromEnv;
    if (process.env.NODE_ENV === 'development') return DEV_FRONTEND_URL;
    return PRODUCTION_FRONTEND_URL;
}
