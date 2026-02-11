import crypto from 'crypto';
import { query, pool } from '../config/db';

interface PasswordResetToken {
    id: number;
    agency_id: number;
    token_hash: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
}

export const passwordResetService = {
    // Gerar token seguro
    generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    },

    // Hash do token para armazenamento
    hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    },

    // Criar token de recuperação
    async createResetToken(agencyId: number): Promise<string> {
        const token = this.generateToken();
        const tokenHash = this.hashToken(token);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora

        // Invalidar tokens anteriores não usados para esta agência
        await query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE agency_id = ? AND used_at IS NULL',
            [agencyId]
        );

        // Criar novo token
        await query(
            `INSERT INTO password_reset_tokens 
             (agency_id, token_hash, expires_at, created_at) 
             VALUES (?, ?, ?, NOW())`,
            [agencyId, tokenHash, expiresAt]
        );

        return token;
    },

    // Validar token
    async validateToken(token: string): Promise<{ valid: boolean; agencyId?: number; message?: string }> {
        const tokenHash = this.hashToken(token);

        const results = await query(
            `SELECT * FROM password_reset_tokens 
             WHERE token_hash = ? AND used_at IS NULL`,
            [tokenHash]
        ) as PasswordResetToken[];

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
    async markTokenAsUsed(token: string): Promise<void> {
        const tokenHash = this.hashToken(token);
        await query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?',
            [tokenHash]
        );
    },

    // Atualizar senha da agência (MD5)
    async updateAgencyPassword(agencyId: number, newPassword: string): Promise<void> {
        const hashedPassword = crypto.createHash('md5').update(newPassword).digest('hex');
        await query(
            'UPDATE agencies SET password = ? WHERE id = ?',
            [hashedPassword, agencyId]
        );
    },

    // Buscar agência por email
    async findAgencyByEmail(email: string): Promise<{ id: number; email: string } | null> {
        const results = await query(
            'SELECT id, email FROM agencies WHERE email = ?',
            [email]
        ) as { id: number; email: string }[];

        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    }
};
