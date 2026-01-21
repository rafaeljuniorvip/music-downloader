import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';

const router = Router();

// GET /api/search - Pesquisa no YouTube
router.get('/', searchController.search);

// GET /api/search/cache/stats - Estatísticas do cache
router.get('/cache/stats', searchController.getCacheStats);

// DELETE /api/search/cache - Limpa o cache
router.delete('/cache', searchController.clearCache);

export default router;
