"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetController = void 0;
const zod_1 = require("zod");
const passwordResetService_1 = require("../services/passwordResetService");
const emailService_1 = require("../services/emailService");
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email()
});
const resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    password: zod_1.z.string().min(6)
});
const validateTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1)
});
exports.passwordResetController = {
    // POST /auth/forgot-password
    async forgotPassword(req, res) {
        try {
            const { email } = forgotPasswordSchema.parse(req.body);
            // Buscar agência por email (não revelar se existe ou não)
            const agency = await passwordResetService_1.passwordResetService.findAgencyByEmail(email);
            // Sempre retornar sucesso para não revelar existência de email
            if (agency) {
                try {
                    // Gerar token
                    const token = await passwordResetService_1.passwordResetService.createResetToken(agency.id);
                    // Construir URL de reset
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
                    // Enviar email
                    await emailService_1.emailService.sendPasswordResetEmail(agency.email, token, resetUrl);
                }
                catch (error) {
                    // Log do erro mas não revelar ao usuário
                    console.error('Erro ao processar recuperação de senha:', error);
                }
            }
            // Sempre retornar sucesso
            res.status(200).json({
                message: 'Se o email estiver cadastrado, você receberá um link de recuperação de senha.'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Email inválido', errors: error.issues });
            }
            console.error('Erro em forgot-password:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    },
    // GET /auth/reset-password/validate
    async validateToken(req, res) {
        try {
            const { token } = validateTokenSchema.parse(req.query);
            const validation = await passwordResetService_1.passwordResetService.validateToken(token);
            if (!validation.valid) {
                return res.status(400).json({
                    valid: false,
                    message: validation.message || 'Token inválido'
                });
            }
            res.status(200).json({
                valid: true,
                message: 'Token válido'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Token inválido', errors: error.issues });
            }
            console.error('Erro em validate-token:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    },
    // POST /auth/reset-password
    async resetPassword(req, res) {
        try {
            const { token, password } = resetPasswordSchema.parse(req.body);
            // Validar token
            const validation = await passwordResetService_1.passwordResetService.validateToken(token);
            if (!validation.valid || !validation.agencyId) {
                return res.status(400).json({
                    message: validation.message || 'Token inválido ou expirado'
                });
            }
            // Atualizar senha
            await passwordResetService_1.passwordResetService.updateAgencyPassword(validation.agencyId, password);
            // Marcar token como usado
            await passwordResetService_1.passwordResetService.markTokenAsUsed(token);
            res.status(200).json({
                message: 'Senha redefinida com sucesso'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error('Erro em reset-password:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    }
};
