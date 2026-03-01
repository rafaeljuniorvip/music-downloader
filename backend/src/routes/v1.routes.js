import { Router } from 'express';
import { requireApiKey } from '../middlewares/auth.middleware.js';
import { downloadController } from '../controllers/download.controller.js';
import { searchController } from '../controllers/search.controller.js';

const router = Router();

// External API endpoints (each protected by API key)
router.post('/v1/download', requireApiKey, downloadController.add);
router.get('/v1/search', requireApiKey, searchController.search);

export default router;
