import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { statSync, existsSync } from 'fs';
import youtubeService from './youtube.service.js';
import historyService from './history.service.js';
import settingsService from './settings.service.js';

const DEFAULT_MAX_CONCURRENT = 2;

class QueueService extends EventEmitter {
  constructor() {
    super();
    this.queue = new Map();
    this.activeDownloads = 0;

    // Escuta eventos do youtube service
    youtubeService.on('progress', (data) => {
      const item = this.queue.get(data.id);
      if (item) {
        item.progress = data.progress;
        item.status = data.status;
        historyService.updateProgress(data.id, data.progress).catch(() => {});
        this.emit('progress', { ...item });
      }
    });

    youtubeService.on('complete', (data) => {
      this.handleComplete(data.id, data.file);
    });

    youtubeService.on('error', (data) => {
      this.handleError(data.id, data.error);
    });

    youtubeService.on('paused', (data) => {
      const item = this.queue.get(data.id);
      if (item) {
        item.status = 'paused';
        this.emit('statusChange', { ...item });
      }
    });

    youtubeService.on('resumed', (data) => {
      const item = this.queue.get(data.id);
      if (item) {
        item.status = 'downloading';
        this.emit('statusChange', { ...item });
      }
    });

    youtubeService.on('cancelled', async (data) => {
      const item = this.queue.get(data.id);
      if (item) {
        item.status = 'cancelled';
        await historyService.updateStatus(data.id, 'cancelled');
        this.emit('statusChange', { ...item });
        this.activeDownloads--;
        this.processNext();
      }
    });
  }

  /**
   * Adiciona item(s) à fila de download
   * @param {string} url - URL do vídeo ou playlist
   * @param {string} type - Tipo: 'video' ou 'playlist'
   * @param {Object} options - Opções adicionais
   * @param {boolean} options.force - Força download mesmo se for duplicado
   */
  async add(url, type = 'video', options = {}) {
    const { force = false } = options;

    try {
      const info = await youtubeService.getInfo(url);
      const items = [];
      const skippedItems = [];
      const playlistId = type === 'playlist' ? uuidv4() : null;
      const playlistName = info.playlistTitle || null;

      for (const videoInfo of info.items) {
        const videoUrl = videoInfo.url || videoInfo.webpage_url || `https://www.youtube.com/watch?v=${videoInfo.id}`;

        // Verifica duplicatas se não for forçado
        if (!force) {
          // Verifica se já está na fila de memória
          const inMemoryQueue = this.existsInMemoryQueue(videoUrl);
          if (inMemoryQueue) {
            skippedItems.push({
              url: videoUrl,
              title: videoInfo.title || inMemoryQueue.title,
              reason: 'in_queue',
              message: 'URL já está na fila',
              existingId: inMemoryQueue.id
            });
            continue;
          }

          // Verifica se já está na fila ativa (banco de dados)
          const inQueue = await historyService.existsInQueue(videoUrl);
          if (inQueue) {
            skippedItems.push({
              url: videoUrl,
              title: videoInfo.title || inQueue.title,
              reason: 'in_queue',
              message: 'URL já está na fila',
              existingId: inQueue.id
            });
            continue;
          }

          // Verifica se já foi baixado com sucesso
          const downloaded = await historyService.wasDownloadedSuccessfully(videoUrl);
          if (downloaded) {
            skippedItems.push({
              url: videoUrl,
              title: videoInfo.title || downloaded.title,
              reason: 'already_downloaded',
              message: 'URL já foi baixado anteriormente',
              existingId: downloaded.id,
              downloadedAt: downloaded.finished_at
            });
            continue;
          }
        }

        const id = uuidv4();
        const channel = videoInfo.uploader || videoInfo.channel || null;

        const item = {
          id,
          url: videoUrl,
          title: videoInfo.title || 'Carregando...',
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          type: type,
          playlistId,
          playlistName,
          thumbnail: videoInfo.thumbnail || null,
          duration: videoInfo.duration || null,
          channel: channel
        };

        this.queue.set(id, item);
        items.push(item);

        // Salva no histórico
        await historyService.add({
          id,
          url: videoUrl,
          title: item.title,
          type,
          playlistId,
          playlistName,
          channel
        });
      }

      if (items.length > 0) {
        this.emit('added', items);
        this.processNext();
      }

      return { items, skippedItems };
    } catch (error) {
      throw new Error(`Erro ao adicionar à fila: ${error.message}`);
    }
  }

  /**
   * Verifica se URL já existe na fila de memória
   */
  existsInMemoryQueue(url) {
    for (const [, item] of this.queue) {
      if (item.url === url && ['pending', 'downloading', 'paused'].includes(item.status)) {
        return item;
      }
    }
    return null;
  }

  /**
   * Processa proximo item da fila
   */
  async processNext() {
    // Busca configuracao de downloads simultaneos
    const settings = await settingsService.getCached();
    const maxConcurrent = settings.maxConcurrent || DEFAULT_MAX_CONCURRENT;

    if (this.activeDownloads >= maxConcurrent) {
      return;
    }

    // Encontra proximo item pendente
    for (const [id, item] of this.queue) {
      if (item.status === 'pending') {
        this.startDownload(id);
        break;
      }
    }
  }

  /**
   * Inicia download de um item
   */
  async startDownload(id) {
    const item = this.queue.get(id);
    if (!item) return;

    this.activeDownloads++;
    item.status = 'downloading';
    item.progress = 0;

    await historyService.updateStatus(id, 'downloading');
    this.emit('statusChange', { ...item });

    try {
      // Busca detalhes completos se necessario
      if (item.title === 'Carregando...' || !item.channel) {
        try {
          const details = await youtubeService.getVideoDetails(item.url);
          item.title = details.title;
          item.thumbnail = details.thumbnail;
          item.duration = details.duration;
          item.channel = details.uploader || item.channel;
          await historyService.updateTitle(id, details.title);
          if (details.uploader) {
            await historyService.updateChannel(id, details.uploader);
          }
          this.emit('statusChange', { ...item });
        } catch (e) {
          // Ignora erro de detalhes, continua com download
        }
      }

      // Registra tempo de inicio do download
      item.startTime = Date.now();

      await youtubeService.download(id, item.url, item.title);
    } catch (error) {
      this.handleError(id, error.message);
    }
  }

  /**
   * Trata conclusao de download
   */
  async handleComplete(id, filePath) {
    const item = this.queue.get(id);
    if (item) {
      item.status = 'completed';
      item.progress = 100;
      item.filePath = filePath;
      item.finishedAt = new Date().toISOString();

      await historyService.updateStatus(id, 'completed', filePath);

      // Calcula e salva estatisticas
      let fileSize = 0;
      let downloadSpeed = 0;

      // Obtem tamanho do arquivo
      if (filePath && existsSync(filePath)) {
        try {
          const stats = statSync(filePath);
          fileSize = stats.size;
        } catch (e) {
          // Ignora erro ao obter tamanho
        }
      }

      // Calcula velocidade de download (bytes/segundo)
      if (item.startTime && fileSize > 0) {
        const downloadTime = (Date.now() - item.startTime) / 1000; // em segundos
        if (downloadTime > 0) {
          downloadSpeed = fileSize / downloadTime;
        }
      }

      // Salva estatisticas no banco
      if (fileSize > 0 || downloadSpeed > 0) {
        await historyService.updateStats(id, {
          fileSize,
          downloadSpeed,
          channel: item.channel
        }).catch(() => {});
      }

      this.emit('complete', { ...item, fileSize, downloadSpeed });
    }

    this.activeDownloads--;
    this.processNext();
  }

  /**
   * Trata erro de download
   */
  async handleError(id, errorMessage) {
    const item = this.queue.get(id);
    if (item) {
      item.status = 'error';
      item.error = errorMessage;

      await historyService.updateStatus(id, 'error', null, errorMessage);
      this.emit('error', { ...item });
    }

    this.activeDownloads--;
    this.processNext();
  }

  /**
   * Pausa um download
   */
  async pause(id) {
    const item = this.queue.get(id);
    if (!item) {
      throw new Error('Item não encontrado');
    }

    if (item.status !== 'downloading') {
      throw new Error('Apenas downloads em andamento podem ser pausados');
    }

    const success = youtubeService.pause(id);
    if (success) {
      item.status = 'paused';
      await historyService.updateStatus(id, 'paused');
      this.emit('statusChange', { ...item });
    }

    return success;
  }

  /**
   * Continua um download pausado
   */
  async resume(id) {
    const item = this.queue.get(id);
    if (!item) {
      throw new Error('Item não encontrado');
    }

    if (item.status !== 'paused') {
      throw new Error('Apenas downloads pausados podem ser continuados');
    }

    const success = youtubeService.resume(id);
    if (success) {
      item.status = 'downloading';
      await historyService.updateStatus(id, 'downloading');
      this.emit('statusChange', { ...item });
    }

    return success;
  }

  /**
   * Cancela/remove um download
   */
  async cancel(id) {
    const item = this.queue.get(id);
    if (!item) {
      throw new Error('Item não encontrado');
    }

    // Se estiver ativo, cancela o processo
    if (item.status === 'downloading' || item.status === 'paused') {
      youtubeService.cancel(id);
      this.activeDownloads--;
    }

    // Se estava pendente, apenas remove
    if (item.status === 'pending') {
      await historyService.updateStatus(id, 'cancelled');
    }

    this.queue.delete(id);
    this.emit('removed', { id });
    this.processNext();

    return true;
  }

  /**
   * Remove item completado ou com erro da fila
   */
  remove(id) {
    const item = this.queue.get(id);
    if (!item) {
      throw new Error('Item não encontrado');
    }

    if (item.status === 'downloading' || item.status === 'paused') {
      throw new Error('Cancele o download antes de remover');
    }

    this.queue.delete(id);
    this.emit('removed', { id });

    return true;
  }

  /**
   * Retorna lista da fila
   */
  getQueue() {
    return Array.from(this.queue.values());
  }

  /**
   * Retorna item específico
   */
  getItem(id) {
    return this.queue.get(id);
  }

  /**
   * Retorna estatísticas da fila
   */
  getStats() {
    const items = this.getQueue();
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      downloading: items.filter(i => i.status === 'downloading').length,
      paused: items.filter(i => i.status === 'paused').length,
      completed: items.filter(i => i.status === 'completed').length,
      error: items.filter(i => i.status === 'error').length
    };
  }

  /**
   * Limpa itens completados da fila
   */
  clearCompleted() {
    for (const [id, item] of this.queue) {
      if (item.status === 'completed' || item.status === 'error' || item.status === 'cancelled') {
        this.queue.delete(id);
      }
    }
    this.emit('cleared');
  }

  /**
   * Re-tenta download com erro
   */
  async retry(id) {
    const historyItem = await historyService.getById(id);
    if (!historyItem) {
      throw new Error('Item não encontrado no histórico');
    }

    if (historyItem.status !== 'error' && historyItem.status !== 'cancelled') {
      throw new Error('Apenas downloads com erro ou cancelados podem ser re-tentados');
    }

    // Atualiza status para pending
    await historyService.updateStatus(id, 'pending');

    // Adiciona de volta à fila
    const item = {
      id,
      url: historyItem.url,
      title: historyItem.title,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      type: historyItem.type,
      playlistId: historyItem.playlist_id
    };

    this.queue.set(id, item);
    this.emit('added', [item]);
    this.processNext();

    return item;
  }

  /**
   * Pausa todos os downloads ativos
   */
  async pauseAll() {
    let count = 0;

    for (const [id, item] of this.queue) {
      if (item.status === 'downloading') {
        try {
          const success = youtubeService.pause(id);
          if (success) {
            item.status = 'paused';
            await historyService.updateStatus(id, 'paused');
            this.emit('statusChange', { ...item });
            count++;
          }
        } catch (error) {
          // Continua com os demais mesmo se um falhar
        }
      }
    }

    return count;
  }

  /**
   * Retoma todos os downloads pausados
   */
  async resumeAll() {
    let count = 0;

    for (const [id, item] of this.queue) {
      if (item.status === 'paused') {
        try {
          const success = youtubeService.resume(id);
          if (success) {
            item.status = 'downloading';
            await historyService.updateStatus(id, 'downloading');
            this.emit('statusChange', { ...item });
            count++;
          }
        } catch (error) {
          // Continua com os demais mesmo se um falhar
        }
      }
    }

    return count;
  }

  /**
   * Cancela todos os downloads (ativos, pausados e pendentes)
   */
  async cancelAll() {
    let count = 0;

    const idsToRemove = [];

    for (const [id, item] of this.queue) {
      if (item.status === 'downloading' || item.status === 'paused') {
        try {
          youtubeService.cancel(id);
          this.activeDownloads--;
          count++;
          idsToRemove.push(id);
        } catch (error) {
          // Continua com os demais mesmo se um falhar
        }
      } else if (item.status === 'pending') {
        await historyService.updateStatus(id, 'cancelled');
        count++;
        idsToRemove.push(id);
      }
    }

    // Remove todos da fila
    for (const id of idsToRemove) {
      this.queue.delete(id);
      this.emit('removed', { id });
    }

    return count;
  }

  /**
   * Re-tenta todos os downloads com erro
   */
  async retryAll() {
    let count = 0;

    // Busca todos os itens com erro no histórico
    const errorItems = await historyService.getHistory({
      status: 'error',
      limit: 1000,
      offset: 0
    });

    for (const historyItem of errorItems) {
      try {
        // Verifica se já não está na fila
        if (this.queue.has(historyItem.id)) {
          continue;
        }

        // Atualiza status para pending
        await historyService.updateStatus(historyItem.id, 'pending');

        // Adiciona de volta à fila
        const item = {
          id: historyItem.id,
          url: historyItem.url,
          title: historyItem.title,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          type: historyItem.type,
          playlistId: historyItem.playlist_id
        };

        this.queue.set(historyItem.id, item);
        this.emit('added', [item]);
        count++;
      } catch (error) {
        // Continua com os demais mesmo se um falhar
      }
    }

    if (count > 0) {
      this.processNext();
    }

    return count;
  }

  /**
   * Adiciona múltiplas URLs de uma vez
   * @param {string[]} urls - Array de URLs
   * @param {string} type - Tipo: 'video' ou 'playlist'
   * @param {Object} options - Opções adicionais
   * @param {boolean} options.force - Força download mesmo se for duplicado
   */
  async addBatch(urls, type = 'video', options = {}) {
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      items: [],
      skippedItems: [],
      errors: []
    };

    for (const url of urls) {
      try {
        const { items, skippedItems } = await this.add(url, type, options);
        results.success += items.length;
        results.skipped += skippedItems.length;
        results.items.push(...items);
        results.skippedItems.push(...skippedItems);
      } catch (error) {
        results.failed++;
        results.errors.push({
          url,
          error: error.message
        });
      }
    }

    return results;
  }
}

export default new QueueService();
