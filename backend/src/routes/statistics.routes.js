import { Router } from 'express';
import { statisticsController } from '../controllers/statistics.controller.js';

const router = Router();

// GET /api/statistics - Estatísticas completas
router.get('/', statisticsController.getComprehensiveStats);

// GET /api/statistics/summary - Resumo rápido para dashboard
router.get('/summary', statisticsController.getSummary);

// GET /api/statistics/total - Totais gerais
router.get('/total', statisticsController.getTotalStats);

// GET /api/statistics/timeline - Downloads por período
router.get('/timeline', statisticsController.getTimeline);

// GET /api/statistics/top-sources - Canais mais baixados
router.get('/top-sources', statisticsController.getTopSources);

// GET /api/statistics/speed - Estatísticas de velocidade
router.get('/speed', statisticsController.getSpeedStats);

// GET /api/statistics/success-rate - Taxa de sucesso
router.get('/success-rate', statisticsController.getSuccessRate);

// GET /api/statistics/errors - Erros recentes
router.get('/errors', statisticsController.getRecentErrors);

// GET /api/statistics/by-type - Estatísticas por tipo
router.get('/by-type', statisticsController.getStatsByType);

export default router;
