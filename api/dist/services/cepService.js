"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cepService = void 0;
exports.cepService = {
    async searchCep(cep) {
        // Sanitizar CEP (remover formatação)
        const normalizedCep = cep.replace(/\D/g, '');
        // Validar formato (deve ter 8 dígitos)
        if (normalizedCep.length !== 8) {
            throw new Error('Invalid CEP format');
        }
        // Criar AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${normalizedCep}`, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                },
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('CEP_NOT_FOUND');
                }
                if (response.status >= 500) {
                    throw new Error('EXTERNAL_SERVICE_ERROR');
                }
                throw new Error('EXTERNAL_SERVICE_ERROR');
            }
            const data = await response.json();
            // Normalizar resposta
            return {
                cep: data.cep || normalizedCep,
                street: data.street || null,
                neighborhood: data.neighborhood || null,
                city: data.city || '',
                state: data.state || '',
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('EXTERNAL_SERVICE_TIMEOUT');
            }
            if (error.message === 'CEP_NOT_FOUND') {
                throw error;
            }
            if (error.message === 'EXTERNAL_SERVICE_ERROR' || error.message === 'EXTERNAL_SERVICE_TIMEOUT') {
                throw error;
            }
            // Erro inesperado
            throw new Error('EXTERNAL_SERVICE_ERROR');
        }
    }
};
