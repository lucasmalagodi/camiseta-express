import { Router } from 'express';
import { agencyPointsImportController } from '../controllers/agencyPointsImportController';
import { spreadsheetUpload } from '../middlewares/spreadsheetUploadMiddleware';
import { protectAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.post('/upload', protectAdmin, spreadsheetUpload.single('file'), agencyPointsImportController.upload);
router.get('/cnpj/:cnpj/items', protectAdmin, agencyPointsImportController.getItemsByCnpj);
router.get('/:id/status', protectAdmin, agencyPointsImportController.getStatus);
router.get('/:id/logs', protectAdmin, agencyPointsImportController.getLogs);
router.post('/:id/resync', protectAdmin, agencyPointsImportController.resync);
router.delete('/:id', protectAdmin, agencyPointsImportController.delete);
router.get('/:id', protectAdmin, agencyPointsImportController.getById);
router.post('/', protectAdmin, agencyPointsImportController.create);
router.get('/', protectAdmin, agencyPointsImportController.getAll);

export default router;
