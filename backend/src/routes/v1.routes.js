import { Router } from 'express';
import { requireApiKey } from '../middlewares/auth.middleware.js';
import { downloadController } from '../controllers/download.controller.js';
import { searchController } from '../controllers/search.controller.js';

const router = Router();

// All v1 routes require API key
router.use(requireApiKey);

// External API endpoints
router.post('/v1/download', downloadController.add);
router.get('/v1/search', searchController.search);

export default router;
