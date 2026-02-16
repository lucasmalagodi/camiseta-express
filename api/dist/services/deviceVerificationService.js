"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceVerificationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
exports.deviceVerificationService = {
    /**
     * Gera um token aleatório para dispositivo
     */
    generateDeviceToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    },
    /**
     * Gera um código de 6 dígitos
     */
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },
    /**
     * Hash de um token ou código usando SHA-256
     */
    hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    },
    /**
     * Verifica se um dispositivo é confiável
     */
    async isDeviceTrusted(agencyId, deviceToken, ipAddress, userAgent) {
        if (!deviceToken) {
            return false;
        }
        const tokenHash = this.hashToken(deviceToken);
        const results = await (0, db_1.query)(`SELECT id FROM trusted_devices 
             WHERE agency_id = ? 
             AND device_token_hash = ? 
             AND ip_address = ? 
             AND expires_at > NOW()`, [agencyId, tokenHash, ipAddress]);
        if (Array.isArray(results) && results.length > 0) {
            // Atualizar last_used_at
            await (0, db_1.query)('UPDATE trusted_devices SET last_used_at = NOW() WHERE id = ?', [results[0].id]);
            return true;
        }
        return false;
    },
    /**
     * Cria um código de verificação e retorna o código em texto plano
     */
    async createVerificationCode(agencyId, ipAddress, userAgent) {
        // Limpar códigos expirados para esta agência
        await (0, db_1.query)('DELETE FROM device_verification_codes WHERE agency_id = ? AND expires_at < NOW()', [agencyId]);
        // Gerar código de 6 dígitos
        const code = this.generateVerificationCode();
        const codeHash = this.hashToken(code);
        // Expira em 10 minutos
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        // Inserir código no banco
        await (0, db_1.query)(`INSERT INTO device_verification_codes 
             (agency_id, code_hash, ip_address, user_agent, expires_at) 
             VALUES (?, ?, ?, ?, ?)`, [agencyId, codeHash, ipAddress, userAgent, expiresAt]);
        return code;
    },
    /**
     * Verifica um código de verificação
     */
    async verifyCode(agencyId, code, ipAddress) {
        const codeHash = this.hashToken(code);
        // Primeiro, verificar se há um código válido para esta agência e IP
        const existingCodes = await (0, db_1.query)(`SELECT id, attempts FROM device_verification_codes 
             WHERE agency_id = ? 
             AND ip_address = ?
             AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`, [agencyId, ipAddress]);
        // Se não há código válido, retornar inválido
        if (!Array.isArray(existingCodes) || existingCodes.length === 0) {
            return { valid: false, attemptsRemaining: 0 };
        }
        const verificationCode = existingCodes[0];
        // Verificar se excedeu o limite de tentativas (máximo 5)
        if (verificationCode.attempts >= 5) {
            // Deletar código após muitas tentativas
            await (0, db_1.query)('DELETE FROM device_verification_codes WHERE id = ?', [verificationCode.id]);
            return { valid: false, attemptsRemaining: 0 };
        }
        // Verificar se o código fornecido corresponde ao código esperado
        const results = await (0, db_1.query)(`SELECT id FROM device_verification_codes 
             WHERE agency_id = ? 
             AND code_hash = ? 
             AND ip_address = ?
             AND expires_at > NOW()`, [agencyId, codeHash, ipAddress]);
        if (!Array.isArray(results) || results.length === 0) {
            // Código incorreto - retornar inválido (as tentativas serão incrementadas no controller)
            return { valid: false, attemptsRemaining: 5 - verificationCode.attempts };
        }
        // Código válido encontrado
        // Deletar código após uso bem-sucedido
        await (0, db_1.query)('DELETE FROM device_verification_codes WHERE id = ?', [verificationCode.id]);
        return { valid: true, attemptsRemaining: 5 - verificationCode.attempts };
    },
    /**
     * Incrementa tentativas de verificação de código para um código incorreto
     */
    async incrementCodeAttempts(agencyId, ipAddress) {
        // Buscar o código mais recente para esta agência e IP
        const results = await (0, db_1.query)(`SELECT id, attempts FROM device_verification_codes 
             WHERE agency_id = ? 
             AND ip_address = ?
             AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`, [agencyId, ipAddress]);
        if (Array.isArray(results) && results.length > 0) {
            const newAttempts = results[0].attempts + 1;
            await (0, db_1.query)('UPDATE device_verification_codes SET attempts = ? WHERE id = ?', [newAttempts, results[0].id]);
            return newAttempts;
        }
        return 0;
    },
    /**
     * Registra um dispositivo como confiável
     */
    async trustDevice(agencyId, deviceToken, ipAddress, userAgent) {
        const tokenHash = this.hashToken(deviceToken);
        // Expira em 30 dias
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        // Verificar se já existe dispositivo confiável com este token
        const existing = await (0, db_1.query)(`SELECT id FROM trusted_devices 
             WHERE agency_id = ? 
             AND device_token_hash = ?`, [agencyId, tokenHash]);
        if (Array.isArray(existing) && existing.length > 0) {
            // Atualizar dispositivo existente
            await (0, db_1.query)(`UPDATE trusted_devices 
                 SET ip_address = ?, 
                     user_agent = ?, 
                     last_used_at = NOW(), 
                     expires_at = ? 
                 WHERE id = ?`, [ipAddress, userAgent, expiresAt, existing[0].id]);
        }
        else {
            // Criar novo dispositivo confiável
            await (0, db_1.query)(`INSERT INTO trusted_devices 
                 (agency_id, device_token_hash, ip_address, user_agent, expires_at) 
                 VALUES (?, ?, ?, ?, ?)`, [agencyId, tokenHash, ipAddress, userAgent, expiresAt]);
        }
    },
    /**
     * Remove dispositivos expirados (limpeza periódica)
     */
    async cleanupExpiredDevices() {
        await (0, db_1.query)('DELETE FROM trusted_devices WHERE expires_at < NOW()');
        await (0, db_1.query)('DELETE FROM device_verification_codes WHERE expires_at < NOW()');
    },
    /**
     * Remove todos os dispositivos confiáveis de uma agência (útil para logout em todos os dispositivos)
     */
    async removeAllTrustedDevices(agencyId) {
        await (0, db_1.query)('DELETE FROM trusted_devices WHERE agency_id = ?', [agencyId]);
    }
};
