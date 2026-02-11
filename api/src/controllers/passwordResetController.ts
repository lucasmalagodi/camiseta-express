import { Request, Response } from 'express';
import { z } from 'zod';
import { passwordResetService } from '../services/passwordResetService';
import { emailService } from '../services/emailService';

const forgotPasswordSchema = z.object({
    email: z.string().email()
});

const resetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(6)
});

const validateTokenSchema = z.object({
    token: z.string().min(1)
});

export const passwordResetController = {
    // POST /auth/forgot-password
    async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = forgotPasswordSchema.parse(req.body);

            // Buscar agência por email (não revelar se existe ou não)
            const agency = await passwordResetService.findAgencyByEmail(email);

            // Sempre retornar sucesso para não revelar existência de email
            if (agency) {
                try {
                    // Gerar token
                    const token = await passwordResetService.createResetToken(agency.id);

                    // Construir URL de reset
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

                    // Enviar email
                    await emailService.sendPasswordResetEmail(agency.email, token, resetUrl);
                } catch (error) {
                    // Log do erro mas não revelar ao usuário
                    console.error('Erro ao processar recuperação de senha:', error);
                }
            }

            // Sempre retornar sucesso
            res.status(200).json({
                message: 'Se o email estiver cadastrado, você receberá um link de recuperação de senha.'
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Email inválido', errors: error.issues });
            }
            console.error('Erro em forgot-password:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    },

    // GET /auth/reset-password/validate
    async validateToken(req: Request, res: Response) {
        try {
            const { token } = validateTokenSchema.parse(req.query);

            const validation = await passwordResetService.validateToken(token);

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
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Token inválido', errors: error.issues });
            }
            console.error('Erro em validate-token:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    },

    // POST /auth/reset-password
    async resetPassword(req: Request, res: Response) {
        try {
            const { token, password } = resetPasswordSchema.parse(req.body);

            // Validar token
            const validation = await passwordResetService.validateToken(token);

            if (!validation.valid || !validation.agencyId) {
                return res.status(400).json({
                    message: validation.message || 'Token inválido ou expirado'
                });
            }

            // Atualizar senha
            await passwordResetService.updateAgencyPassword(validation.agencyId, password);

            // Marcar token como usado
            await passwordResetService.markTokenAsUsed(token);

            res.status(200).json({
                message: 'Senha redefinida com sucesso'
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Dados inválidos', errors: error.issues });
            }
            console.error('Erro em reset-password:', error);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    }
};
