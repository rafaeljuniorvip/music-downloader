import { Router } from 'express';
import { downloadController } from '../controllers/download.controller.js';

const router = Router();

// Rotas de download/fila
router.get('/download/preview', downloadController.preview);
router.post('/download/add', downloadController.add);
router.get('/download/queue', downloadController.getQueue);
router.get('/download/progress', downloadController.progress);
router.post('/download/clear-completed', downloadController.clearCompleted);

// Rotas de operacoes em lote (batch)
router.post('/download/batch-add', downloadController.addBatch);
router.post('/download/pause-all', downloadController.pauseAll);
router.post('/download/resume-all', downloadController.resumeAll);
router.post('/download/cancel-all', downloadController.cancelAll);
router.post('/download/retry-all', downloadController.retryAll);

// Rotas de operacoes individuais (com :id no final para evitar conflito)
router.post('/download/:id/pause', downloadController.pause);
router.post('/download/:id/resume', downloadController.resume);
router.post('/download/:id/retry', downloadController.retry);
router.delete('/download/:id', downloadController.cancel);

// Rotas de histórico
router.get('/history', downloadController.getHistory);
router.delete('/history/:id', downloadController.deleteHistory);
router.delete('/history', downloadController.clearHistory);

// Rota para servir arquivos
router.get('/files/:filename', downloadController.serveFile);

// Rotas de streaming de áudio
router.get('/download/stream/:videoId', downloadController.getStreamUrl);
router.get('/stream/:videoId', downloadController.proxyStream);

export default router;
