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
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const db_1 = require("../config/db");
const executiveService_1 = require("./executiveService");
const executiveNotificationEmailService_1 = require("./executiveNotificationEmailService");
const emailService_1 = require("./emailService");
/**
 * Serviço centralizado para roteamento dinâmico de notificações por email
 * baseado em agências, executivos e filiais.
 */
exports.notificationService = {
    /**
     * Obtém lista de emails para notificação baseado na agência
     *
     * Regras de roteamento:
     * 1. Se agency tem executive_id:
     *    - Envia para: executive.email + todos os executive_notification_emails ativos
     * 2. Se agency NÃO tem executive_id:
     *    - Busca todos os executivos da branch_id da agência
     *    - Envia para todos os emails primários e adicionais dos executivos ativos
     * 3. Remove duplicatas antes de retornar
     */
    async getNotificationEmailsForAgency(agencyId) {
        // Buscar agência com executive_id e branch_id
        const agencyResults = await (0, db_1.query)('SELECT executive_id, branch_id FROM agencies WHERE id = ?', [agencyId]);
        if (!Array.isArray(agencyResults) || agencyResults.length === 0) {
            console.warn(`Agency ${agencyId} not found`);
            return [];
        }
        const agency = agencyResults[0];
        const executiveId = agency.executive_id;
        const branchId = agency.branch_id;
        const emailSet = new Set();
        // Regra 1: Se agency tem executive_id
        if (executiveId) {
            const executive = await executiveService_1.executiveService.findById(executiveId);
            if (executive && executive.active) {
                // Adicionar email primário do executivo
                if (executive.email) {
                    emailSet.add(executive.email.toLowerCase().trim());
                }
                // Adicionar todos os emails adicionais ativos
                const additionalEmails = await executiveNotificationEmailService_1.executiveNotificationEmailService.findActiveByExecutiveId(executiveId);
                for (const additionalEmail of additionalEmails) {
                    if (additionalEmail.email) {
                        emailSet.add(additionalEmail.email.toLowerCase().trim());
                    }
                }
            }
        }
        // Regra 2: Se agency NÃO tem executive_id, buscar por branch_id
        else if (branchId) {
            const executives = await executiveService_1.executiveService.findByBranchId(branchId);
            for (const executive of executives) {
                if (executive.active) {
                    // Adicionar email primário do executivo
                    if (executive.email) {
                        emailSet.add(executive.email.toLowerCase().trim());
                    }
                    // Adicionar todos os emails adicionais ativos
                    const additionalEmails = await executiveNotificationEmailService_1.executiveNotificationEmailService.findActiveByExecutiveId(executive.id);
                    for (const additionalEmail of additionalEmails) {
                        if (additionalEmail.email) {
                            emailSet.add(additionalEmail.email.toLowerCase().trim());
                        }
                    }
                }
            }
        }
        // Converter Set para Array e remover duplicatas (já removidas pelo Set)
        return Array.from(emailSet).filter(email => email.length > 0);
    },
    /**
     * Envia notificação de novo pedido para os emails corretos baseado na agência
     */
    async sendOrderNotification(orderId, agencyId, agencyName, totalPoints, orderUrl) {
        try {
            // Obter lista de emails para notificação
            const recipientEmails = await this.getNotificationEmailsForAgency(agencyId);
            if (recipientEmails.length === 0) {
                console.log(`No recipients found for agency ${agencyId}. Skipping email notification.`);
                return;
            }
            // Enviar email para cada destinatário
            // Usar o método existente do emailService mas adaptado para múltiplos destinatários
            const smtpConfig = await emailService_1.emailService.getActiveSmtpConfig();
            if (!smtpConfig) {
                console.warn('SMTP configuration not found. Cannot send order notification emails.');
                return;
            }
            // Preparar lista de destinatários
            const recipients = recipientEmails.join(', ');
            // Usar método interno para enviar email
            await this.sendEmailToRecipients(recipients, `Novo Pedido Recebido - Pedido #${orderId}`, this.buildOrderNotificationHtml(orderId, agencyName, totalPoints, orderUrl), smtpConfig);
            console.log(`Order notification email sent to ${recipientEmails.length} recipient(s) for order #${orderId}`);
        }
        catch (error) {
            console.error('Error sending order notification:', error);
            // Não bloquear o fluxo se o envio de email falhar
        }
    },
    /**
     * Método auxiliar para enviar email para múltiplos destinatários
     */
    async sendEmailToRecipients(recipients, subject, htmlContent, smtpConfig) {
        const nodemailer = await Promise.resolve().then(() => __importStar(require('nodemailer')));
        const { decrypt } = await Promise.resolve().then(() => __importStar(require('../utils/encryption')));
        // Descriptografar senha
        const decryptedPassword = decrypt(smtpConfig.password_encrypted);
        // Criar transporter
        const transporter = nodemailer.createTransport({
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
            to: recipients,
            subject: subject,
            html: htmlContent
        };
        // Enviar email
        await transporter.sendMail(mailOptions);
    },
    /**
     * Constrói HTML para notificação de pedido
     */
    buildOrderNotificationHtml(orderId, agencyName, totalPoints, orderUrl) {
        return `
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
        `;
    },
};
