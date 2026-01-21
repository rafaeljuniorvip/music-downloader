import statisticsService from '../services/statistics.service.js';

export const statisticsController = {
  /**
   * GET /api/statistics
   * Retorna estatísticas completas do sistema
   */
  async getComprehensiveStats(req, res) {
    try {
      const stats = await statisticsService.getComprehensiveStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/statistics/summary
   * Retorna resumo rápido para dashboard
   */
  async getSummary(req, res) {
    try {
      const summary = await statisticsService.getSummary();

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Erro ao buscar resumo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar resumo',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/statistics/total
   * Retorna estatísticas totais
   */
  async getTotalStats(req, res) {
    try {
      const stats = await statisticsService.getTotalStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar totais:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar totais',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/statistics/timeline
   * Retorna downloads por período
   */
  async getTimeline(req, res) {
    try {
      const { period = 'day', limit = 30 } = req.query;

      const validPeriods = ['day', 'week', 'month'];
      if (!validPeriods.includes(period)) {
        return res.status(400).json({
          success: false,
          error: 'Período inválido. Use: day, week ou month'
        });
      }

      const data = await statisticsService.getDownloadsByPeriod(period, parseInt(limit));

      res.json({
        success: true,
        data: {
          period,
          items: data
        }
      });
    } catch (error) {
      console.error('Erro ao buscar timeline:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar timeline',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/statistics/top-sources
   * Retorna os canais mais baixados
   */
  async getTopSources(req, res) {
    try {
      const { limit = 10 } = req.query;
      const sources = await statisticsService.getTopSources(parseInt(limit));

      res.json({
        success: true,
        data: sources
      });
    } catch (error) {
      console.error('Erro ao buscar top sources:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar canais',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/statistics/speed
   * Retorna estatísticas de velocidade
   */
  async getSpeedStats(req, res) {
    try {
      const speed = await statisticsService.getAverageSpeed();

      res.json({
        success: true,
        data: speed
      });
    } catch (error) {
      console.error('Erro ao buscar velocidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar velocidade',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/statistics/success-rate
   * Retorna taxa de sucesso
   */
  async getSuccessRate(req, res) {
    try {
      const rate = await statisticsService.getSuccessRate();

      res.json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Erro ao buscar taxa de sucesso:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar taxa de sucesso',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/statistics/errors
   * Retorna erros recentes
   */
  async getRecentErrors(req, res) {
    try {
      const { limit = 10 } = req.query;
      const errors = await statisticsService.getRecentErrors(parseInt(limit));

      res.json({
        success: true,
        data: errors
      });
    } catch (error) {
      console.error('Erro ao buscar erros:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar erros',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/statistics/by-type
   * Retorna estatísticas por tipo
   */
  async getStatsByType(req, res) {
    try {
      const stats = await statisticsService.getStatsByType();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar por tipo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar por tipo',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};
