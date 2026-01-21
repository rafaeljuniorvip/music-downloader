import youtubeService from '../services/youtube.service.js';

// Cache simples em memória com TTL de 10 minutos
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos em ms

/**
 * Gera chave de cache baseada nos parâmetros de busca
 */
function getCacheKey(query, limit, type) {
  return `${type}:${limit}:${query.toLowerCase().trim()}`;
}

/**
 * Limpa entradas expiradas do cache
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now > value.expiresAt) {
      cache.delete(key);
    }
  }
}

// Limpa cache a cada 5 minutos
setInterval(cleanExpiredCache, 5 * 60 * 1000);

export const searchController = {
  /**
   * GET /api/search
   * Pesquisa vídeos ou playlists no YouTube
   * Query params: q (query), limit (default 20), type (video/playlist)
   */
  async search(req, res) {
    try {
      const { q, limit = 20, type = 'video' } = req.query;

      // Validação do parâmetro de busca
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetro de busca "q" é obrigatório'
        });
      }

      // Validação do tipo
      const validTypes = ['video', 'playlist'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo inválido. Use: video ou playlist'
        });
      }

      // Validação e sanitização do limite
      const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

      // Verifica cache
      const cacheKey = getCacheKey(q, parsedLimit, type);
      const cached = cache.get(cacheKey);

      if (cached && Date.now() < cached.expiresAt) {
        return res.json({
          success: true,
          data: {
            query: q.trim(),
            type: type,
            cached: true,
            results: cached.results
          }
        });
      }

      // Executa busca
      const results = await youtubeService.search(q.trim(), parsedLimit, type);

      // Armazena no cache
      cache.set(cacheKey, {
        results: results,
        expiresAt: Date.now() + CACHE_TTL
      });

      res.json({
        success: true,
        data: {
          query: q.trim(),
          type: type,
          cached: false,
          results: results
        }
      });
    } catch (error) {
      console.error('Erro ao pesquisar no YouTube:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao pesquisar no YouTube',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * DELETE /api/search/cache
   * Limpa o cache de pesquisa
   */
  async clearCache(req, res) {
    try {
      const size = cache.size;
      cache.clear();

      res.json({
        success: true,
        message: `Cache limpo. ${size} entradas removidas.`
      });
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao limpar cache',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/search/cache/stats
   * Retorna estatísticas do cache
   */
  async getCacheStats(req, res) {
    try {
      cleanExpiredCache();

      res.json({
        success: true,
        data: {
          entries: cache.size,
          ttlMinutes: CACHE_TTL / 60000
        }
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas do cache:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter estatísticas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};
