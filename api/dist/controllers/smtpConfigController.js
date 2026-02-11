"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smtpConfigController = void 0;
const zod_1 = require("zod");
const emailService_1 = require("../services/emailService");
const smtpConfigSchema = zod_1.z.object({
    host: zod_1.z.string().min(1, 'Host é obrigatório'),
    port: zod_1.z.number().int().min(1).max(65535, 'Porta inválida'),
    secure: zod_1.z.boolean().default(false),
    user: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(1, 'Senha é obrigatória').nullable().optional(),
    from_email: zod_1.z.string().email('Email remetente inválido'),
    from_name: zod_1.z.string().min(1, 'Nome remetente é obrigatório')
});
exports.smtpConfigController = {
    // GET /api/admin/smtp-config
    async getConfig(req, res) {
        try {
            const config = await emailService_1.emailService.getActiveSmtpConfig();
            if (!config) {
                return res.status(200).json({
                    config: null,
                    message: 'Nenhuma configuração SMTP encontrada'
                });
            }
            // Retornar configuração sem a senha criptografada
            res.status(200).json({
                config: {
                    id: config.id,
                    host: config.host,
                    port: config.port,
                    secure: config.secure,
                    user: config.user,
                    from_email: config.from_email,
                    from_name: config.from_name,
                    active: config.active,
                    created_at: config.created_at,
                    updated_at: config.updated_at
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar configuração SMTP:', error);
            res.status(500).json({ message: 'Erro ao buscar configuração SMTP' });
        }
    },
    // POST /api/admin/smtp-config
    async setConfig(req, res) {
        try {
            const data = smtpConfigSchema.parse(req.body);
            // Verificar se já existe configuração
            const existingConfig = await emailService_1.emailService.getActiveSmtpConfig();
            // Se não tem senha e já existe config, manter senha existente
            if (!data.password && existingConfig) {
                await emailService_1.emailService.setSmtpConfig({
                    host: data.host,
                    port: data.port,
                    secure: data.secure,
                    user: data.user,
                    password: null, // Indica para manter senha existente
                    from_email: data.from_email,
                    from_name: data.from_name
                });
            }
            else {
                // Se não tem senha e não existe config, erro
                if (!data.password) {
                    return res.status(400).json({
                        message: 'Senha é obrigatória para criar nova configuração'
                    });
                }
                // Se tem senha, usar normalmente
                await emailService_1.emailService.setSmtpConfig({
                    host: data.host,
                    port: data.port,
                    secure: data.secure,
                    user: data.user,
                    password: data.password,
                    from_email: data.from_email,
                    from_name: data.from_name
                });
            }
            res.status(200).json({
                message: 'Configuração SMTP salva com sucesso'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    message: 'Dados inválidos',
                    errors: error.issues
                });
            }
            console.error('Erro ao salvar configuração SMTP:', error);
            res.status(500).json({ message: 'Erro ao salvar configuração SMTP' });
        }
    },
    // POST /api/admin/smtp-config/test
    async testConfig(req, res) {
        try {
            // Usar email do admin logado ou email fornecido no body
            const testEmail = req.body.email || req.user?.email;
            if (!testEmail) {
                return res.status(400).json({
                    message: 'Email é obrigatório para teste',
                    error: 'Nenhum email fornecido e usuário não possui email cadastrado'
                });
            }
            // Validar formato do email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(testEmail)) {
                return res.status(400).json({
                    message: 'Email inválido',
                    error: 'Formato de email inválido'
                });
            }
            // Tentar enviar email de teste
            await emailService_1.emailService.sendTestEmail(testEmail);
            res.status(200).json({
                success: true,
                message: `Email de teste enviado com sucesso para ${testEmail}`,
                email: testEmail
            });
        }
        catch (error) {
            console.error('Erro ao testar configuração SMTP:', error);
            // Capturar erros específicos do nodemailer
            let errorMessage = 'Erro ao enviar email de teste';
            let errorDetails = error.message || 'Erro desconhecido';
            if (error.code === 'EAUTH') {
                errorMessage = 'Erro de autenticação';
                errorDetails = 'Credenciais inválidas. Verifique o email e senha de autenticação.';
            }
            else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
                errorMessage = 'Erro de conexão';
                errorDetails = `Não foi possível conectar ao servidor SMTP. Verifique o host e porta. Detalhes: ${error.message}`;
            }
            else if (error.code === 'EENVELOPE') {
                errorMessage = 'Erro no endereço de email';
                errorDetails = 'Endereço de email inválido. Verifique o email do remetente.';
            }
            else if (error.responseCode) {
                errorMessage = 'Erro do servidor SMTP';
                errorDetails = `Servidor SMTP retornou erro: ${error.responseCode} - ${error.response || error.message}`;
            }
            res.status(500).json({
                success: false,
                message: errorMessage,
                error: errorDetails,
                code: error.code || 'UNKNOWN_ERROR'
            });
        }
    }
};
