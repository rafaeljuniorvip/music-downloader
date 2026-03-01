import { Router } from 'express';
import { requireApiKey } from '../middlewares/auth.middleware.js';
import { downloadController } from '../controllers/download.controller.js';
import { searchController } from '../controllers/search.controller.js';

const router = Router();

// External API endpoints (each protected by API key)
router.post('/v1/download', requireApiKey, downloadController.add);
router.get('/v1/download/:id', requireApiKey, downloadController.getById);
router.get('/v1/search', requireApiKey, searchController.search);
router.get('/v1/queue', requireApiKey, downloadController.getQueue);
router.get('/v1/files/:filename', requireApiKey, downloadController.serveFile);
router.get('/v1/stream/:id', requireApiKey, downloadController.serveFileById);
router.get('/v1/stream/youtube/:videoId', requireApiKey, downloadController.proxyStream);
router.get('/v1/history', requireApiKey, downloadController.getHistory);

export default router;
