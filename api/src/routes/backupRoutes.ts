import { Router } from 'express';
import { backupController } from '../controllers/backupController';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação admin
router.use(protectAdmin);

// Log de debug para verificar se as rotas estão sendo registradas
console.log('📦 Backup routes module loaded');

// IMPORTANTE: Rotas específicas devem vir ANTES das rotas com parâmetros
// Listar backups (rota raiz - DEVE vir primeiro)
router.get('/', backupController.listBackups);

// Criar backup manual
router.post('/create', backupController.createManualBackup);

// Download de backup (específica antes de /:id)
router.get('/:id/download', backupController.downloadBackup);

// Validar backup (específica antes de /:id)
router.get('/:id/validate', backupController.validateBackup);

// Obter backup específico (deve vir por último)
router.get('/:id', backupController.getBackup);

// Deletar backup
router.delete('/:id', backupController.deleteBackup);

export default router;
