import { Request, Response } from 'express';
import { backupService } from '../services/backupService';
import fs from 'fs';
import path from 'path';

export const backupController = {
    /**
     * Lista todos os backups
     */
    async listBackups(req: Request, res: Response) {
        try {
            console.log('[BackupController] listBackups chamado');
            const backups = await backupService.listBackups();
            console.log(`[BackupController] ${backups.length} backup(s) encontrado(s)`);
            res.json({
                success: true,
                data: backups
            });
        } catch (error: any) {
            console.error('Erro ao listar backups:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao listar backups',
                error: error.message
            });
        }
    },

    /**
     * Cria um backup manual
     */
    async createManualBackup(req: Request, res: Response) {
        try {
            // Iniciar backup em background
            backupService.createBackup('MANUAL')
                .then((backupId) => {
                    console.log(`Backup manual ${backupId} criado com sucesso`);
                })
                .catch((error) => {
                    console.error('Erro ao criar backup manual:', error);
                });

            // Retornar resposta imediata
            res.json({
                success: true,
                message: 'Backup manual iniciado. O processo será executado em background.'
            });
        } catch (error: any) {
            console.error('Erro ao iniciar backup manual:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao iniciar backup manual',
                error: error.message
            });
        }
    },

    /**
     * Faz download de um backup
     */
    async downloadBackup(req: Request, res: Response) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const backupId = parseInt(idParam);
            if (isNaN(backupId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de backup inválido'
                });
            }

            const backup = await backupService.getBackupById(backupId);
            if (!backup) {
                return res.status(404).json({
                    success: false,
                    message: 'Backup não encontrado'
                });
            }

            if (backup.status !== 'DONE') {
                return res.status(400).json({
                    success: false,
                    message: 'Backup ainda não foi concluído ou falhou'
                });
            }

            if (!fs.existsSync(backup.file_path)) {
                return res.status(404).json({
                    success: false,
                    message: 'Arquivo de backup não encontrado no servidor'
                });
            }

            // Configurar headers para download
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('Content-Disposition', `attachment; filename="${backup.file_name}"`);
            res.setHeader('Content-Length', backup.file_size);

            // Enviar arquivo
            const fileStream = fs.createReadStream(backup.file_path);
            fileStream.pipe(res);

            fileStream.on('error', (error) => {
                console.error('Erro ao ler arquivo de backup:', error);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: 'Erro ao ler arquivo de backup'
                    });
                }
            });
        } catch (error: any) {
            console.error('Erro ao fazer download do backup:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao fazer download do backup',
                    error: error.message
                });
            }
        }
    },

    /**
     * Deleta um backup
     */
    async deleteBackup(req: Request, res: Response) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const backupId = parseInt(idParam);
            if (isNaN(backupId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de backup inválido'
                });
            }

            await backupService.deleteBackup(backupId);

            res.json({
                success: true,
                message: 'Backup deletado com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao deletar backup:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao deletar backup',
                error: error.message
            });
        }
    },

    /**
     * Obtém informações de um backup específico
     */
    async getBackup(req: Request, res: Response) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const backupId = parseInt(idParam);
            if (isNaN(backupId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de backup inválido'
                });
            }

            const backup = await backupService.getBackupById(backupId);
            if (!backup) {
                return res.status(404).json({
                    success: false,
                    message: 'Backup não encontrado'
                });
            }

            res.json({
                success: true,
                data: backup
            });
        } catch (error: any) {
            console.error('Erro ao obter backup:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao obter backup',
                error: error.message
            });
        }
    },

    /**
     * Valida um backup
     */
    async validateBackup(req: Request, res: Response) {
        try {
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const backupId = parseInt(idParam);
            if (isNaN(backupId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de backup inválido'
                });
            }

            const validation = await backupService.validateBackup(backupId);

            res.json({
                success: true,
                data: validation
            });
        } catch (error: any) {
            console.error('Erro ao validar backup:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao validar backup',
                error: error.message
            });
        }
    }
};
