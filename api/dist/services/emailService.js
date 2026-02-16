"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
// Chave de criptografia (deve estar em variável de ambiente em produção)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
const ALGORITHM = 'aes-256-cbc';
// Função para criptografar
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
// Função para descriptografar
function decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
exports.emailService = {
    // Obter configuração SMTP ativa
    async getActiveSmtpConfig() {
        const results = await (0, db_1.query)('SELECT * FROM config_smtp WHERE active = true LIMIT 1');
        if (Array.isArray(results) && results.length > 0) {
            return results[0];
        }
        return null;
    },
    // Criar ou atualizar configuração SMTP
    async setSmtpConfig(config) {
        const connection = await db_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            // Verificar se já existe configuração ativa
            const [existingResults] = await connection.execute('SELECT id, password_encrypted FROM config_smtp WHERE active = true LIMIT 1');
            const existingConfig = Array.isArray(existingResults) && existingResults.length > 0
                ? existingResults[0]
                : null;
            // Preparar senha criptografada
            let encryptedPassword;
            if (config.password === null) {
                // Se password é null e existe config, manter senha existente
                if (existingConfig) {
                    encryptedPassword = existingConfig.password_encrypted;
                }
                else {
                    throw new Error('Senha é obrigatória para criar nova configuração');
                }
            }
            else {
                // Criptografar nova senha
                encryptedPassword = encrypt(config.password);
            }
            if (existingConfig) {
                // ATUALIZAR configuração existente
                await connection.execute(`UPDATE config_smtp 
                     SET host = ?, port = ?, secure = ?, user = ?, password_encrypted = ?, 
                         from_email = ?, from_name = ?, updated_at = NOW()
                     WHERE id = ?`, [
                    config.host,
                    config.port,
                    config.secure,
                    config.user,
                    encryptedPassword,
                    config.from_email,
                    config.from_name,
                    existingConfig.id
                ]);
            }
            else {
                // Desativar todas as configurações existentes (caso haja alguma inativa)
                await connection.execute('UPDATE config_smtp SET active = false');
                // INSERIR nova configuração apenas se não existir
                await connection.execute(`INSERT INTO config_smtp 
                     (host, port, secure, user, password_encrypted, from_email, from_name, active) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, true)`, [
                    config.host,
                    config.port,
                    config.secure,
                    config.user,
                    encryptedPassword,
                    config.from_email,
                    config.from_name
                ]);
            }
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    // Enviar email de recuperação de senha
    async sendPasswordResetEmail(email, resetToken, resetUrl) {
        const smtpConfig = await this.getActiveSmtpConfig();
        if (!smtpConfig) {
            throw new Error('SMTP configuration not found. Please configure SMTP settings.');
        }
        // Descriptografar senha
        const decryptedPassword = decrypt(smtpConfig.password_encrypted);
        // Criar transporter
        const transporter = nodemailer_1.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: decryptedPassword
            }
        });
        // Conteúdo do email
        const mailOptions = {
            from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
            to: email,
            subject: 'Recuperação de Senha',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                        .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Recuperação de Senha</h1>
                        </div>
                        <div class="content">
                            <p>Olá,</p>
                            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                            <p>Clique no botão abaixo para redefinir sua senha:</p>
                            <p style="text-align: center;">
                                <a href="${resetUrl}" class="button">Redefinir Senha</a>
                            </p>
                            <p>Ou copie e cole o link abaixo no seu navegador:</p>
                            <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
                            <div class="warning">
                                <strong>⚠️ Importante:</strong> Este link expira em 1 hora. Se você não solicitou esta recuperação, ignore este email.
                            </div>
                            <p>Por segurança, este link só pode ser usado uma vez.</p>
                        </div>
                        <div class="footer">
                            <p>Este é um email automático, por favor não responda.</p>
                            <p>Se você não solicitou esta recuperação, pode ignorar este email com segurança.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Recuperação de Senha

Olá,

Recebemos uma solicitação para redefinir a senha da sua conta.

Acesse o link abaixo para redefinir sua senha:
${resetUrl}

⚠️ IMPORTANTE: Este link expira em 1 hora. Se você não solicitou esta recuperação, ignore este email.

Por segurança, este link só pode ser usado uma vez.

Este é um email automático, por favor não responda.
            `
        };
        // Enviar email
        await transporter.sendMail(mailOptions);
    },
    // Enviar email de teste
    async sendTestEmail(toEmail) {
        const smtpConfig = await this.getActiveSmtpConfig();
        if (!smtpConfig) {
            throw new Error('SMTP configuration not found. Please configure SMTP settings first.');
        }
        // Descriptografar senha
        const decryptedPassword = decrypt(smtpConfig.password_encrypted);
        // Criar transporter
        const transporter = nodemailer_1.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: decryptedPassword
            },
            // Timeout para conexão
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
        // Verificar conexão antes de enviar
        await transporter.verify();
        // Conteúdo do email de teste
        const mailOptions = {
            from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
            to: toEmail,
            subject: 'Teste de Configuração SMTP',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; }
                        .success { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 12px; margin: 20px 0; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Teste de Email SMTP</h1>
                        </div>
                        <div class="content">
                            <p>Olá,</p>
                            <p>Este é um email de teste para validar a configuração SMTP do sistema.</p>
                            <div class="success">
                                <strong>✓ Sucesso!</strong> Se você recebeu este email, significa que a configuração SMTP está funcionando corretamente.
                            </div>
                            <p><strong>Detalhes da configuração:</strong></p>
                            <ul>
                                <li>Host: ${smtpConfig.host}</li>
                                <li>Porta: ${smtpConfig.port}</li>
                                <li>Seguro: ${smtpConfig.secure ? 'Sim (SSL/TLS)' : 'Não (STARTTLS)'}</li>
                                <li>Remetente: ${smtpConfig.from_name} &lt;${smtpConfig.from_email}&gt;</li>
                            </ul>
                            <p>Data/Hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
                            <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                                Este é um email automático de teste. Você pode ignorá-lo com segurança.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Teste de Email SMTP

Olá,

Este é um email de teste para validar a configuração SMTP do sistema.

✓ Sucesso! Se você recebeu este email, significa que a configuração SMTP está funcionando corretamente.

Detalhes da configuração:
- Host: ${smtpConfig.host}
- Porta: ${smtpConfig.port}
- Seguro: ${smtpConfig.secure ? 'Sim (SSL/TLS)' : 'Não (STARTTLS)'}
- Remetente: ${smtpConfig.from_name} <${smtpConfig.from_email}>

Data/Hora do teste: ${new Date().toLocaleString('pt-BR')}

Este é um email automático de teste. Você pode ignorá-lo com segurança.
            `
        };
        // Enviar email
        await transporter.sendMail(mailOptions);
    },
    // Enviar email de notificação de novo pedido
    async sendNewOrderNotification(orderId, agencyName, totalPoints, orderUrl) {
        const smtpConfig = await this.getActiveSmtpConfig();
        if (!smtpConfig) {
            console.warn('SMTP configuration not found. Cannot send order notification emails.');
            return;
        }
        // Buscar todos os emails ativos de notificação
        const orderNotificationEmailService = (await Promise.resolve().then(() => __importStar(require('./orderNotificationEmailService')))).orderNotificationEmailService;
        const activeEmails = await orderNotificationEmailService.findActive();
        if (activeEmails.length === 0) {
            console.log('No active notification emails configured. Skipping email notification.');
            return;
        }
        // Descriptografar senha
        const decryptedPassword = decrypt(smtpConfig.password_encrypted);
        // Criar transporter
        const transporter = nodemailer_1.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: decryptedPassword
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
        // Preparar lista de destinatários
        const recipients = activeEmails.map(e => e.email).join(', ');
        // Conteúdo do email
        const mailOptions = {
            from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
            to: recipients,
            subject: `Novo Pedido Recebido - Pedido #${orderId}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Novo Pedido Recebido</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Novo Pedido Recebido!</h1>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                        <p style="font-size: 16px; margin-bottom: 20px;">Olá,</p>
                        
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Um novo pedido foi recebido no sistema:
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Pedido #${orderId}</strong>
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Agência:</strong> ${agencyName}
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Total:</strong> ${totalPoints.toFixed(0)} pontos
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${orderUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                Ver Detalhes do Pedido
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            Este é um email automático. Por favor, não responda.
                        </p>
                    </div>
                </body>
                </html>
            `
        };
        // Enviar email para todos os destinatários
        await transporter.sendMail(mailOptions);
        console.log(`Order notification email sent to ${activeEmails.length} recipient(s) for order #${orderId}`);
    },
    // Enviar email de notificação de novo pedido para executivo
    async sendExecutiveOrderNotification(orderId, agencyName, agencyCnpj, totalPoints, orderUrl, executiveEmail, executiveName) {
        const smtpConfig = await this.getActiveSmtpConfig();
        if (!smtpConfig) {
            console.warn('SMTP configuration not found. Cannot send executive order notification email.');
            return;
        }
        // Descriptografar senha
        const decryptedPassword = decrypt(smtpConfig.password_encrypted);
        // Criar transporter
        const transporter = nodemailer_1.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: decryptedPassword
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
        // Conteúdo do email
        const mailOptions = {
            from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
            to: executiveEmail,
            subject: `Novo Pedido - Agência ${agencyName} - Pedido #${orderId}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Novo Pedido Recebido</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Novo Pedido Recebido!</h1>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Olá${executiveName ? `, ${executiveName}` : ''},
                        </p>
                        
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Uma agência vinculada a você realizou um novo pedido:
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Pedido #${orderId}</strong>
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Agência:</strong> ${agencyName}
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>CNPJ:</strong> ${agencyCnpj}
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Total:</strong> ${totalPoints.toFixed(0)} pontos
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${orderUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                Ver Detalhes do Pedido
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            Este é um email automático. Por favor, não responda.
                        </p>
                    </div>
                </body>
                </html>
            `
        };
        // Enviar email
        await transporter.sendMail(mailOptions);
        console.log(`Executive order notification email sent to ${executiveEmail} for order #${orderId}`);
    },
    // Enviar email de notificação de criação de ticket
    async sendTicketCreatedNotification(ticketId, subject, message, agencyEmail, agencyName) {
        const smtpConfig = await this.getActiveSmtpConfig();
        if (!smtpConfig) {
            console.warn('SMTP configuration not found. Cannot send ticket creation notification email.');
            return;
        }
        // Descriptografar senha
        const decryptedPassword = decrypt(smtpConfig.password_encrypted);
        // Criar transporter
        const transporter = nodemailer_1.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: decryptedPassword
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
        // Construir URL do ticket
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const ticketUrl = `${frontendUrl}/tickets/${ticketId}`;
        // Conteúdo do email
        const mailOptions = {
            from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
            to: agencyEmail,
            subject: `Ticket de Suporte Criado - #${ticketId}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Ticket de Suporte Criado</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Ticket de Suporte Criado</h1>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Olá, ${agencyName},
                        </p>
                        
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Seu ticket de suporte foi criado com sucesso. Nossa equipe entrará em contato em breve.
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Ticket #${ticketId}</strong>
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Assunto:</strong> ${subject}
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Sua mensagem:</strong>
                            </p>
                            <p style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; font-size: 14px;">
                                ${message.replace(/\n/g, '<br>')}
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${ticketUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                Ver Ticket e Responder
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            Este é um email automático. Por favor, não responda. Use o link acima para responder ao ticket.
                        </p>
                    </div>
                </body>
                </html>
            `
        };
        // Enviar email
        await transporter.sendMail(mailOptions);
        console.log(`Ticket creation notification email sent to ${agencyEmail} for ticket #${ticketId}`);
    },
    // Enviar email de notificação de resposta ao ticket
    async sendTicketReplyNotification(ticketId, subject, replyMessage, agencyEmail, agencyName) {
        const smtpConfig = await this.getActiveSmtpConfig();
        if (!smtpConfig) {
            console.warn('SMTP configuration not found. Cannot send ticket reply notification email.');
            return;
        }
        // Descriptografar senha
        const decryptedPassword = decrypt(smtpConfig.password_encrypted);
        // Criar transporter
        const transporter = nodemailer_1.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: decryptedPassword
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
        // Construir URL do ticket
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const ticketUrl = `${frontendUrl}/tickets/${ticketId}`;
        // Conteúdo do email
        const mailOptions = {
            from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
            to: agencyEmail,
            subject: `Nova Resposta no Ticket #${ticketId}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Nova Resposta no Ticket</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Nova Resposta no Ticket</h1>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Olá, ${agencyName},
                        </p>
                        
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Você recebeu uma nova resposta no seu ticket de suporte.
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Ticket #${ticketId}</strong>
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Assunto:</strong> ${subject}
                            </p>
                            <p style="margin: 10px 0; font-size: 16px;">
                                <strong>Resposta da equipe:</strong>
                            </p>
                            <p style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; font-size: 14px;">
                                ${replyMessage.replace(/\n/g, '<br>')}
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${ticketUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                Ver Ticket e Responder
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            Este é um email automático. Por favor, não responda. Use o link acima para responder ao ticket.
                        </p>
                    </div>
                </body>
                </html>
            `
        };
        // Enviar email
        await transporter.sendMail(mailOptions);
        console.log(`Ticket reply notification email sent to ${agencyEmail} for ticket #${ticketId}`);
    },
    // Enviar código de verificação de dispositivo
    async sendDeviceVerificationCode(agencyEmail, agencyName, verificationCode) {
        const smtpConfig = await this.getActiveSmtpConfig();
        if (!smtpConfig) {
            throw new Error('SMTP configuration not found. Cannot send device verification code.');
        }
        // Descriptografar senha
        const decryptedPassword = decrypt(smtpConfig.password_encrypted);
        // Criar transporter
        const transporter = nodemailer_1.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.user,
                pass: decryptedPassword
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
        // Conteúdo do email
        const mailOptions = {
            from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
            to: agencyEmail,
            subject: 'Código de Verificação de Dispositivo',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Código de Verificação</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Verificação de Dispositivo</h1>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Olá, ${agencyName},
                        </p>
                        
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            Detectamos um novo dispositivo tentando acessar sua conta. Para sua segurança, precisamos verificar este dispositivo.
                        </p>
                        
                        <div style="background: white; padding: 30px; border-radius: 8px; margin: 20px 0; border: 2px solid #667eea; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #666; margin-bottom: 10px;">Seu código de verificação:</p>
                            <p style="margin: 0; font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">
                                ${verificationCode}
                            </p>
                        </div>
                        
                        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; font-size: 14px; color: #92400E;">
                                <strong>⚠️ Importante:</strong> Este código expira em 10 minutos e pode ser usado apenas uma vez. 
                                Se você não solicitou este código, ignore este email ou entre em contato conosco imediatamente.
                            </p>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            Este é um email automático de segurança. Por favor, não responda.
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `
Verificação de Dispositivo

Olá, ${agencyName},

Detectamos um novo dispositivo tentando acessar sua conta. Para sua segurança, precisamos verificar este dispositivo.

Seu código de verificação: ${verificationCode}

⚠️ IMPORTANTE: Este código expira em 10 minutos e pode ser usado apenas uma vez. 
Se você não solicitou este código, ignore este email ou entre em contato conosco imediatamente.

Este é um email automático de segurança. Por favor, não responda.
            `
        };
        // Enviar email
        await transporter.sendMail(mailOptions);
        console.log(`Device verification code sent to ${agencyEmail}`);
    }
};
