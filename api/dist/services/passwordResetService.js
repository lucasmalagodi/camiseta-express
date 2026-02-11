"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
exports.passwordResetService = {
    // Gerar token seguro
    generateToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    },
    // Hash do token para armazenamento
    hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    },
    // Criar token de recuperação
    async createResetToken(agencyId) {
        const token = this.generateToken();
        const tokenHash = this.hashToken(token);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora
        // Invalidar tokens anteriores não usados para esta agência
        await (0, db_1.query)('UPDATE password_reset_tokens SET used_at = NOW() WHERE agency_id = ? AND used_at IS NULL', [agencyId]);
        // Criar novo token
        await (0, db_1.query)(`INSERT INTO password_reset_tokens 
             (agency_id, token_hash, expires_at, created_at) 
             VALUES (?, ?, ?, NOW())`, [agencyId, tokenHash, expiresAt]);
        return token;
    },
    // Validar token
    async validateToken(token) {
        const tokenHash = this.hashToken(token);
        const results = await (0, db_1.query)(`SELECT * FROM password_reset_tokens 
             WHERE token_hash = ? AND used_at IS NULL`, [tokenHash]);
        if (!Array.isArray(results) || results.length === 0) {
            return { valid: false, message: 'Token inválido ou já utilizado' };
        }
        const tokenRecord = results[0];
        // Verificar se expirou
        const now = new Date();
        const expiresAt = new Date(tokenRecord.expires_at);
        if (now > expiresAt) {
            return { valid: false, message: 'Token expirado' };
        }
        return { valid: true, agencyId: tokenRecord.agency_id };
    },
    // Marcar token como usado
    async markTokenAsUsed(token) {
        const tokenHash = this.hashToken(token);
        await (0, db_1.query)('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?', [tokenHash]);
    },
    // Atualizar senha da agência (MD5)
    async updateAgencyPassword(agencyId, newPassword) {
        const hashedPassword = crypto_1.default.createHash('md5').update(newPassword).digest('hex');
        await (0, db_1.query)('UPDATE agencies SET password = ? WHERE id = ?', [hashedPassword, agencyId]);
    },
    // Buscar agência por email
    async findAgencyByEmail(email) {
        const results = await (0, db_1.query)('SELECT id, email FROM agencies WHERE email = ?', [email]);
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    }
};
