import { Router } from 'express';
import { protectAdmin } from '../middlewares/authMiddleware';
import { shipmentController } from '../controllers/shipmentController';

const router = Router();

router.use(protectAdmin);

router.get('/pending-orders', shipmentController.listPendingOrders);
router.get('/processed-orders', shipmentController.listProcessedOrders);
router.get('/preparation/queue', shipmentController.getPreparationQueue);
router.get('/preparation/batches/:batchId/detail', shipmentController.getPreparationBatchDetail);
router.get('/preparation/batches/:batchId/export-csv', shipmentController.exportPreparationBatchCsv);
router.get('/preparation/batches', shipmentController.listPreparationBatches);
router.post('/preparation/mark-processed', shipmentController.markOrderProcessed);
router.post('/preparation/finalize-batch', shipmentController.finalizePreparationBatch);
router.post('/batch', shipmentController.createBatch);
router.post('/', shipmentController.create);
router.get('/', shipmentController.list);
router.get('/:id', shipmentController.getById);
router.patch('/:id', shipmentController.update);

export default router;
