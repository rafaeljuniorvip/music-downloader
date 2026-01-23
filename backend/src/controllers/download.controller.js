import queueService from '../services/queue.service.js';
import historyService from '../services/history.service.js';
import youtubeService from '../services/youtube.service.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, createReadStream, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOWNLOADS_DIR = join(__dirname, '../../downloads');

// Armazena clientes SSE conectados
const sseClients = new Set();

// Cache de previews (5 minutos de TTL)
const previewCache = new Map();
const PREVIEW_CACHE_TTL = 5 * 60 * 1000; // 5 minutos em ms

// Cache de stream URLs (1 hora de TTL - YouTube URLs expiram)
const streamUrlCache = new Map();
const STREAM_URL_CACHE_TTL = 60 * 60 * 1000; // 1 hora em ms

/**
 * Limpa entradas expiradas do cache de preview
 */
function cleanPreviewCache() {
  const now = Date.now();
  for (const [key, value] of previewCache.entries()) {
    if (now - value.timestamp > PREVIEW_CACHE_TTL) {
      previewCache.delete(key);
    }
  }
}

/**
 * Limpa entradas expiradas do cache de stream URLs
 */
function cleanStreamUrlCache() {
  const now = Date.now();
  for (const [key, value] of streamUrlCache.entries()) {
    if (now - value.timestamp > STREAM_URL_CACHE_TTL) {
      streamUrlCache.delete(key);
    }
  }
}

// Envia evento para todos os clientes SSE
function broadcastSSE(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}

// Escuta eventos da fila
queueService.on('progress', (data) => broadcastSSE('progress', data));
queueService.on('statusChange', (data) => broadcastSSE('statusChange', data));
queueService.on('complete', (data) => broadcastSSE('complete', data));
queueService.on('error', (data) => broadcastSSE('error', data));
queueService.on('added', (data) => broadcastSSE('added', data));
queueService.on('removed', (data) => broadcastSSE('removed', data));

export const downloadController = {
  /**
   * GET /api/download/preview
   * Obtém preview de um vídeo sem baixar
   * Query: { url: string }
   */
  async preview(req, res) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL é obrigatória'
        });
      }

      // Valida se é URL do YouTube
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeRegex.test(url)) {
        return res.status(400).json({
          success: false,
          error: 'URL inválida. Use uma URL do YouTube'
        });
      }

      // Verifica cache
      const cacheKey = url;
      const cached = previewCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp < PREVIEW_CACHE_TTL)) {
        return res.json({
          success: true,
          cached: true,
          data: cached.data
        });
      }

      // Limpa cache expirado periodicamente
      cleanPreviewCache();

      // Busca informações do vídeo
      const preview = await youtubeService.getPreview(url);

      // Armazena no cache
      previewCache.set(cacheKey, {
        data: preview,
        timestamp: now
      });

      res.json({
        success: true,
        cached: false,
        data: preview
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/add
   * Adiciona URL à fila de download
   * Body: { url: string, type?: 'video'|'playlist', force?: boolean }
   */
  async add(req, res) {
    try {
      const { url, type = 'video', force = false } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL é obrigatória'
        });
      }

      // Valida se é URL do YouTube
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeRegex.test(url)) {
        return res.status(400).json({
          success: false,
          error: 'URL inválida. Use uma URL do YouTube'
        });
      }

      const { items, skippedItems } = await queueService.add(url, type, { force });

      // Se todos foram ignorados por duplicação
      if (items.length === 0 && skippedItems.length > 0) {
        const firstSkipped = skippedItems[0];
        const message = firstSkipped.reason === 'in_queue'
          ? 'URL já está na fila'
          : 'URL já foi baixado anteriormente';

        return res.status(409).json({
          success: false,
          error: message,
          isDuplicate: true,
          duplicateInfo: {
            reason: firstSkipped.reason,
            existingId: firstSkipped.existingId,
            title: firstSkipped.title,
            downloadedAt: firstSkipped.downloadedAt || null
          },
          skippedItems
        });
      }

      // Monta mensagem de resposta
      let message = `${items.length} item(s) adicionado(s) à fila`;
      if (skippedItems.length > 0) {
        message += ` (${skippedItems.length} ignorado(s) por duplicação)`;
      }

      res.json({
        success: true,
        message,
        data: items,
        skippedItems: skippedItems.length > 0 ? skippedItems : undefined
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/download/queue
   * Retorna lista da fila atual
   */
  getQueue(req, res) {
    try {
      const queue = queueService.getQueue();
      const stats = queueService.getStats();

      res.json({
        success: true,
        data: {
          items: queue,
          stats
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/:id/pause
   * Pausa um download em andamento
   */
  async pause(req, res) {
    try {
      const { id } = req.params;
      const success = await queueService.pause(id);

      if (success) {
        res.json({
          success: true,
          message: 'Download pausado'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Não foi possível pausar o download'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/:id/resume
   * Continua um download pausado
   */
  async resume(req, res) {
    try {
      const { id } = req.params;
      const success = await queueService.resume(id);

      if (success) {
        res.json({
          success: true,
          message: 'Download retomado'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Não foi possível retomar o download'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/download/:id
   * Cancela ou remove um download
   */
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const success = await queueService.cancel(id);

      if (success) {
        res.json({
          success: true,
          message: 'Download removido'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Não foi possível remover o download'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/:id/retry
   * Re-tenta um download com erro
   */
  async retry(req, res) {
    try {
      const { id } = req.params;
      const item = await queueService.retry(id);

      res.json({
        success: true,
        message: 'Download re-adicionado à fila',
        data: item
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/download/progress
   * Server-Sent Events para progresso em tempo real
   */
  progress(req, res) {
    // Configura SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Envia estado atual da fila
    const queue = queueService.getQueue();
    res.write(`event: init\ndata: ${JSON.stringify(queue)}\n\n`);

    // Adiciona cliente à lista
    sseClients.add(res);

    // Heartbeat para manter conexão viva
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    // Remove cliente quando desconectar
    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  },

  /**
   * GET /api/history
   * Retorna histórico de downloads
   */
  async getHistory(req, res) {
    try {
      const {
        status,
        type,
        search,
        limit = 50,
        offset = 0,
        orderBy = 'created_at',
        order = 'DESC'
      } = req.query;

      const history = await historyService.getHistory({
        status,
        type,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy,
        order
      });

      const total = await historyService.count({ status, type, search });
      const stats = await historyService.getStats();

      // Transforma snake_case para camelCase
      const transformedHistory = history.map(item => ({
        id: item.id,
        url: item.url,
        title: item.title,
        status: item.status,
        createdAt: item.created_at,
        completedAt: item.finished_at,
        filePath: item.file_path,
        errorMessage: item.error_message,
        type: item.type,
        playlistId: item.playlist_id,
        playlistName: item.playlist_name,
        progress: item.progress,
        fileSize: item.file_size,
        downloadSpeed: item.download_speed,
        channel: item.channel
      }));

      res.json({
        success: true,
        data: {
          items: transformedHistory,
          total,
          stats,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + history.length < total
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/history/:id
   * Remove item do histórico
   */
  async deleteHistory(req, res) {
    try {
      const { id } = req.params;
      const success = await historyService.delete(id);

      if (success) {
        res.json({
          success: true,
          message: 'Item removido do histórico'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Item não encontrado'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/history
   * Limpa histórico
   */
  async clearHistory(req, res) {
    try {
      const { daysOld } = req.query;

      let count;
      if (daysOld) {
        count = await historyService.clearOld(parseInt(daysOld));
      } else {
        count = await historyService.clearAll();
      }

      res.json({
        success: true,
        message: `${count} registro(s) removido(s)`,
        count
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/files/:filename
   * Serve arquivo MP3 para download
   */
  serveFile(req, res) {
    try {
      const { filename } = req.params;
      const filePath = join(DOWNLOADS_DIR, filename);

      // Previne path traversal
      if (!filePath.startsWith(DOWNLOADS_DIR)) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado'
        });
      }

      if (!existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'Arquivo não encontrado'
        });
      }

      const stat = statSync(filePath);
      const fileSize = stat.size;

      // Suporte a range requests para streaming
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`
        });

        createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
        });

        createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/clear-completed
   * Remove itens completados da fila
   */
  clearCompleted(req, res) {
    try {
      queueService.clearCompleted();
      res.json({
        success: true,
        message: 'Itens completados removidos da fila'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/pause-all
   * Pausa todos os downloads ativos
   */
  async pauseAll(req, res) {
    try {
      const count = await queueService.pauseAll();

      res.json({
        success: true,
        count,
        message: `${count} item(ns) pausado(s)`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/resume-all
   * Retoma todos os downloads pausados
   */
  async resumeAll(req, res) {
    try {
      const count = await queueService.resumeAll();

      res.json({
        success: true,
        count,
        message: `${count} item(ns) retomado(s)`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/cancel-all
   * Cancela todos os downloads
   */
  async cancelAll(req, res) {
    try {
      const count = await queueService.cancelAll();

      res.json({
        success: true,
        count,
        message: `${count} item(ns) cancelado(s)`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/retry-all
   * Re-tenta todos os downloads com erro
   */
  async retryAll(req, res) {
    try {
      const count = await queueService.retryAll();

      res.json({
        success: true,
        count,
        message: `${count} item(ns) re-adicionado(s) à fila`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/download/batch-add
   * Adiciona múltiplas URLs de uma vez
   * Body: { urls: string[], type?: 'video'|'playlist', force?: boolean }
   */
  async addBatch(req, res) {
    try {
      const { urls, type = 'video', force = false } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Lista de URLs é obrigatória'
        });
      }

      // Valida URLs do YouTube
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      const invalidUrls = urls.filter(url => !youtubeRegex.test(url));

      if (invalidUrls.length > 0) {
        return res.status(400).json({
          success: false,
          error: `URLs inválidas encontradas: ${invalidUrls.length}`,
          invalidUrls
        });
      }

      const results = await queueService.addBatch(urls, type, { force });

      // Monta mensagem de resposta
      let message = `${results.success} item(ns) adicionado(s) à fila`;
      if (results.skipped > 0) {
        message += ` (${results.skipped} ignorado(s) por duplicação)`;
      }

      res.json({
        success: true,
        count: results.success,
        message,
        data: {
          items: results.items,
          skipped: results.skipped,
          skippedItems: results.skippedItems,
          failed: results.failed,
          errors: results.errors
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/download/stream/:videoId
   * Retorna URL de stream de áudio para reprodução direta
   * Param: videoId - ID do vídeo do YouTube ou URL completa
   */
  async getStreamUrl(req, res) {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'Video ID é obrigatório'
        });
      }

      // Normaliza o videoId (extrai ID se for URL)
      const normalizedId = youtubeService.extractVideoId(videoId) || videoId;

      // Verifica cache
      const cached = streamUrlCache.get(normalizedId);
      const now = Date.now();

      if (cached && (now - cached.timestamp < STREAM_URL_CACHE_TTL)) {
        return res.json({
          success: true,
          cached: true,
          data: {
            videoId: normalizedId,
            streamUrl: cached.data.streamUrl,
            expiresAt: new Date(cached.timestamp + STREAM_URL_CACHE_TTL).toISOString(),
            title: cached.data.title,
            duration: cached.data.duration,
            thumbnail: cached.data.thumbnail
          }
        });
      }

      // Limpa cache expirado periodicamente
      cleanStreamUrlCache();

      // Busca URL de stream
      const streamData = await youtubeService.getStreamUrl(videoId);

      // Armazena no cache
      streamUrlCache.set(normalizedId, {
        data: streamData,
        timestamp: now
      });

      res.json({
        success: true,
        cached: false,
        data: {
          videoId: streamData.videoId || normalizedId,
          streamUrl: streamData.streamUrl,
          expiresAt: new Date(now + STREAM_URL_CACHE_TTL).toISOString(),
          title: streamData.title,
          duration: streamData.duration,
          thumbnail: streamData.thumbnail
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/stream/:videoId
   * Proxy de streaming de áudio (evita problemas de CORS)
   * Suporta range requests para seeking
   * Param: videoId - ID do vídeo do YouTube ou URL completa
   */
  async proxyStream(req, res) {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'Video ID é obrigatório'
        });
      }

      // Normaliza o videoId
      const normalizedId = youtubeService.extractVideoId(videoId) || videoId;

      // Verifica cache ou busca URL de stream
      let streamUrl;
      const cached = streamUrlCache.get(normalizedId);
      const now = Date.now();

      if (cached && (now - cached.timestamp < STREAM_URL_CACHE_TTL)) {
        streamUrl = cached.data.streamUrl;
      } else {
        // Busca nova URL de stream
        const streamData = await youtubeService.getStreamUrl(videoId);
        streamUrl = streamData.streamUrl;

        // Atualiza cache
        streamUrlCache.set(normalizedId, {
          data: streamData,
          timestamp: now
        });
      }

      // Prepara headers para proxy
      const headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'
      };

      // Suporte a range requests
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      // Faz request para o stream
      const response = await fetch(streamUrl, { headers });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: `Erro ao obter stream: ${response.statusText}`
        });
      }

      // Configura headers de resposta
      res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/webm');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length');

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
        res.status(206);
      }

      // Pipe do stream
      const nodeStream = response.body;

      // Converte ReadableStream para Node stream se necessário
      if (nodeStream.pipe) {
        nodeStream.pipe(res);
      } else {
        // Para ambientes onde response.body é um Web ReadableStream
        const reader = nodeStream.getReader();

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                res.end();
                break;
              }
              res.write(Buffer.from(value));
            }
          } catch (error) {
            console.error('Erro no streaming:', error);
            res.end();
          }
        };

        pump();
      }

      // Limpa quando cliente desconectar
      req.on('close', () => {
        if (nodeStream.cancel) {
          nodeStream.cancel();
        }
      });
    } catch (error) {
      // Só envia erro se ainda não começou a enviar o stream
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }
};
