import { Router } from 'express';
import { agencyPointsImportController } from '../controllers/agencyPointsImportController';
import { spreadsheetUpload } from '../middlewares/spreadsheetUploadMiddleware';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Rotas específicas devem vir ANTES de rotas com parâmetros dinâmicos
// Isso evita que Express trate "upload" como um ID
// Aplicar autenticação antes do upload do arquivo
router.post('/upload', protect, spreadsheetUpload.single('file'), agencyPointsImportController.upload);
router.get('/cnpj/:cnpj/items', protect, agencyPointsImportController.getItemsByCnpj);
router.get('/:id/status', protect, agencyPointsImportController.getStatus);
router.get('/:id/logs', protect, agencyPointsImportController.getLogs);
router.delete('/:id', protect, agencyPointsImportController.delete);
router.get('/:id', protect, agencyPointsImportController.getById);

// Rotas gerais por último
router.post('/', protect, agencyPointsImportController.create);
router.get('/', protect, agencyPointsImportController.getAll);

export default router;
