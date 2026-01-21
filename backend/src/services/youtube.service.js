import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync, statSync } from 'fs';
import settingsService from './settings.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Usa variavel de ambiente ou caminho local para desenvolvimento
const YT_DLP_PATH = process.env.YT_DLP_PATH || '/home/rafaeljrs/gits/falavipytdlhtml/musicas_playlist/yt-dlp';
const DEFAULT_DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || join(__dirname, '../../downloads');
const COOKIES_FILE = process.env.COOKIES_FILE || null;

// Opcoes comuns para evitar detecção de bot
const getCommonArgs = () => {
  const args = [
    '--user-agent', 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'
  ];

  if (process.env.NODE_ENV === 'production') {
    console.log('[YouTube Service] Ambiente: production');
    console.log('[YouTube Service] COOKIES_FILE env:', COOKIES_FILE);

    // Em producao, usa arquivo de cookies se existir
    if (COOKIES_FILE) {
      const cookiesExist = existsSync(COOKIES_FILE);
      console.log('[YouTube Service] Arquivo de cookies existe:', cookiesExist);

      if (cookiesExist) {
        args.push('--cookies', COOKIES_FILE);
        args.push('--no-cookies-from-browser');
        // Não salvar cookies modificados (volume é read-only)
        args.push('--cookies-no-save');
        console.log('[YouTube Service] ✓ Usando arquivo de cookies:', COOKIES_FILE);
      } else {
        console.warn('[YouTube Service] ⚠ Arquivo de cookies não encontrado:', COOKIES_FILE);
      }
    } else {
      console.warn('[YouTube Service] ⚠ COOKIES_FILE não configurado');
    }
    args.push('--no-check-certificates');
  } else {
    console.log('[YouTube Service] Ambiente: development - usando cookies do navegador');
    args.push('--cookies-from-browser', 'firefox');
  }

  return args;
};

const COMMON_ARGS = getCommonArgs();

class YoutubeService extends EventEmitter {
  constructor() {
    super();
    this.activeProcesses = new Map();
  }

  /**
   * Formata duração em segundos para string legível (MM:SS ou HH:MM:SS)
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return null;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Obtém preview de um vídeo (informações sem baixar)
   */
  async getPreview(url) {
    return new Promise((resolve, reject) => {
      const args = [
        ...COMMON_ARGS,
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        url
      ];

      const process = spawn(YT_DLP_PATH, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Erro ao obter preview do vídeo'));
          return;
        }

        try {
          const info = JSON.parse(stdout);

          // Formata data de upload (YYYYMMDD -> YYYY-MM-DD)
          let uploadDate = null;
          if (info.upload_date) {
            const d = info.upload_date;
            uploadDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
          }

          // Estima tamanho do arquivo de áudio (aproximado)
          let estimatedSize = null;
          if (info.duration && info.abr) {
            // Tamanho aproximado = bitrate (kbps) * duração (s) / 8 (bits para bytes) * 1000 (kbps para bps)
            estimatedSize = Math.round((info.abr * 1000 * info.duration) / 8);
          }

          // Coleta formatos de áudio disponíveis
          const audioFormats = [];
          if (info.formats && Array.isArray(info.formats)) {
            const seenFormats = new Set();
            for (const format of info.formats) {
              if (format.acodec && format.acodec !== 'none') {
                const key = `${format.acodec}-${format.abr || 'unknown'}`;
                if (!seenFormats.has(key)) {
                  seenFormats.add(key);
                  audioFormats.push({
                    codec: format.acodec,
                    bitrate: format.abr || null,
                    ext: format.ext,
                    filesize: format.filesize || null
                  });
                }
              }
            }
          }

          resolve({
            id: info.id,
            title: info.title,
            duration: info.duration || null,
            durationFormatted: this.formatDuration(info.duration),
            thumbnail: info.thumbnail || null,
            channel: info.uploader || info.channel || null,
            channelUrl: info.uploader_url || info.channel_url || null,
            viewCount: info.view_count || null,
            uploadDate: uploadDate,
            description: info.description ? info.description.substring(0, 500) : null,
            estimatedSize: estimatedSize,
            audioFormats: audioFormats.length > 0 ? audioFormats : null,
            url: info.webpage_url || url
          });
        } catch (error) {
          reject(new Error('Erro ao parsear preview: ' + error.message));
        }
      });

      process.on('error', (error) => {
        reject(new Error('Erro ao executar yt-dlp: ' + error.message));
      });
    });
  }

  /**
   * Extrai informações de um vídeo ou playlist
   */
  async getInfo(url) {
    return new Promise((resolve, reject) => {
      const args = [
        ...COMMON_ARGS,
        '--dump-json',
        '--flat-playlist',
        '--no-warnings',
        url
      ];

      const process = spawn(YT_DLP_PATH, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Erro ao extrair informações'));
          return;
        }

        try {
          // Pode ter múltiplas linhas JSON para playlists
          const lines = stdout.trim().split('\n').filter(Boolean);
          const items = lines.map(line => JSON.parse(line));

          if (items.length === 1) {
            resolve({ type: 'video', items: items });
          } else {
            resolve({ type: 'playlist', items: items });
          }
        } catch (error) {
          reject(new Error('Erro ao parsear informações: ' + error.message));
        }
      });
    });
  }

  /**
   * Extrai informações detalhadas de um vídeo específico
   */
  async getVideoDetails(url) {
    return new Promise((resolve, reject) => {
      const args = [
        ...COMMON_ARGS,
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        url
      ];

      const process = spawn(YT_DLP_PATH, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Erro ao extrair detalhes'));
          return;
        }

        try {
          const info = JSON.parse(stdout);
          resolve({
            id: info.id,
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            uploader: info.uploader,
            url: info.webpage_url || url
          });
        } catch (error) {
          reject(new Error('Erro ao parsear detalhes: ' + error.message));
        }
      });
    });
  }

  /**
   * Baixa e converte video para audio usando configuracoes
   */
  async download(downloadId, url, title = null) {
    // Busca configuracoes
    const settings = await settingsService.getCached();
    const audioFormat = settings.audioFormat || 'mp3';
    const audioQuality = settings.audioQuality || '0';
    const embedThumbnail = settings.embedThumbnail !== false;
    const downloadDir = settings.downloadDir || DEFAULT_DOWNLOADS_DIR;

    return new Promise((resolve, reject) => {
      const safeTitle = title
        ? title.replace(/[^\w\s\-áéíóúàèìòùâêîôûãõç]/gi, '').substring(0, 100)
        : '%(title)s';

      const outputTemplate = join(downloadDir, `${safeTitle}.%(ext)s`);

      const args = [
        ...COMMON_ARGS,
        '--extract-audio',
        '--audio-format', audioFormat,
        '--audio-quality', audioQuality,
        '--no-playlist',
        '--newline',
        '--progress',
        '-o', outputTemplate,
        url
      ];

      // Adiciona opcao de thumbnail embutida se habilitado
      if (embedThumbnail) {
        args.push('--embed-thumbnail');
      }

      const ytProcess = spawn(YT_DLP_PATH, args);
      this.activeProcesses.set(downloadId, { process: ytProcess, paused: false });

      let lastProgress = 0;
      let outputFile = null;

      ytProcess.stdout.on('data', (data) => {
        const output = data.toString();

        // Extrai progresso do download
        const progressMatch = output.match(/(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          if (progress > lastProgress) {
            lastProgress = progress;
            this.emit('progress', {
              id: downloadId,
              progress: progress,
              status: progress < 100 ? 'downloading' : 'converting'
            });
          }
        }

        // Detecta arquivo de destino
        const destMatch = output.match(/\[ExtractAudio\] Destination: (.+)/);
        if (destMatch) {
          outputFile = destMatch[1].trim();
        }

        // Alternativa para detectar arquivo
        const mergerMatch = output.match(/\[Merger\] Merging formats into "(.+)"/);
        if (mergerMatch) {
          outputFile = mergerMatch[1].trim().replace(/\.\w+$/, `.${audioFormat}`);
        }
      });

      ytProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('WARNING')) {
          this.emit('error', { id: downloadId, error: error });
        }
      });

      ytProcess.on('close', (code) => {
        this.activeProcesses.delete(downloadId);

        if (code === 0) {
          // Tenta encontrar o arquivo se nao foi detectado
          if (!outputFile) {
            const files = readdirSync(downloadDir);
            const recent = files
              .filter(f => f.endsWith(`.${audioFormat}`))
              .map(f => ({
                name: f,
                time: statSync(join(downloadDir, f)).mtime
              }))
              .sort((a, b) => b.time - a.time)[0];

            if (recent) {
              outputFile = join(downloadDir, recent.name);
            }
          }

          this.emit('complete', { id: downloadId, file: outputFile });
          resolve({ success: true, file: outputFile });
        } else {
          const error = new Error('Download falhou');
          this.emit('error', { id: downloadId, error: error.message });
          reject(error);
        }
      });

      ytProcess.on('error', (error) => {
        this.activeProcesses.delete(downloadId);
        this.emit('error', { id: downloadId, error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Pausa um download (envia SIGSTOP)
   */
  pause(downloadId) {
    const item = this.activeProcesses.get(downloadId);
    if (item && !item.paused) {
      item.process.kill('SIGSTOP');
      item.paused = true;
      this.emit('paused', { id: downloadId });
      return true;
    }
    return false;
  }

  /**
   * Continua um download pausado (envia SIGCONT)
   */
  resume(downloadId) {
    const item = this.activeProcesses.get(downloadId);
    if (item && item.paused) {
      item.process.kill('SIGCONT');
      item.paused = false;
      this.emit('resumed', { id: downloadId });
      return true;
    }
    return false;
  }

  /**
   * Cancela um download (envia SIGTERM)
   */
  cancel(downloadId) {
    const item = this.activeProcesses.get(downloadId);
    if (item) {
      // Se estiver pausado, primeiro continua para poder matar
      if (item.paused) {
        item.process.kill('SIGCONT');
      }
      item.process.kill('SIGTERM');
      this.activeProcesses.delete(downloadId);
      this.emit('cancelled', { id: downloadId });
      return true;
    }
    return false;
  }

  /**
   * Pesquisa vídeos no YouTube
   * @param {string} query - Termo de busca
   * @param {number} limit - Número máximo de resultados (padrão: 20)
   * @param {string} type - Tipo de busca: 'video' ou 'playlist' (padrão: 'video')
   * @returns {Promise<Array>} Array de resultados
   */
  async search(query, limit = 20, type = 'video') {
    return new Promise((resolve, reject) => {
      const searchPrefix = type === 'playlist' ? 'ytsearchpl' : 'ytsearch';
      const searchQuery = `${searchPrefix}${limit}:${query}`;

      const args = [
        ...COMMON_ARGS,
        '--dump-json',
        '--flat-playlist',
        '--no-warnings',
        searchQuery
      ];

      const process = spawn(YT_DLP_PATH, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Erro ao pesquisar no YouTube'));
          return;
        }

        try {
          const lines = stdout.trim().split('\n').filter(Boolean);
          const results = lines.map(line => {
            const info = JSON.parse(line);

            // Formata data de upload (YYYYMMDD -> YYYY-MM-DD)
            let uploadDate = null;
            if (info.upload_date) {
              const d = info.upload_date;
              uploadDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
            }

            return {
              id: info.id,
              title: info.title,
              duration: info.duration || null,
              durationFormatted: this.formatDuration(info.duration),
              thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
              channel: info.uploader || info.channel || null,
              viewCount: info.view_count || null,
              uploadDate: uploadDate,
              url: info.url || info.webpage_url || `https://www.youtube.com/watch?v=${info.id}`
            };
          });

          resolve(results);
        } catch (error) {
          reject(new Error('Erro ao parsear resultados da pesquisa: ' + error.message));
        }
      });

      process.on('error', (error) => {
        reject(new Error('Erro ao executar yt-dlp: ' + error.message));
      });
    });
  }

  /**
   * Verifica se um download está ativo
   */
  isActive(downloadId) {
    return this.activeProcesses.has(downloadId);
  }

  /**
   * Retorna status de um download
   */
  getStatus(downloadId) {
    const item = this.activeProcesses.get(downloadId);
    if (!item) return null;
    return {
      active: true,
      paused: item.paused
    };
  }

  /**
   * Obtém URL de stream de áudio direto do YouTube
   * @param {string} videoId - ID do vídeo ou URL completa
   * @returns {Promise<{streamUrl: string, title: string, duration: number, thumbnail: string}>}
   */
  async getStreamUrl(videoId) {
    return new Promise((resolve, reject) => {
      // Constrói URL se apenas o ID foi passado
      const url = videoId.includes('youtube.com') || videoId.includes('youtu.be')
        ? videoId
        : `https://www.youtube.com/watch?v=${videoId}`;

      const args = [
        ...COMMON_ARGS,
        '-f', 'bestaudio',
        '--get-url',
        '--no-playlist',
        '--no-warnings',
        url
      ];

      const process = spawn(YT_DLP_PATH, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Erro ao obter URL de stream'));
          return;
        }

        const streamUrl = stdout.trim();

        if (!streamUrl) {
          reject(new Error('Não foi possível obter URL de stream'));
          return;
        }

        // Busca informações adicionais do vídeo
        try {
          const videoInfo = await this.getVideoDetails(url);
          resolve({
            streamUrl,
            videoId: videoInfo.id,
            title: videoInfo.title,
            duration: videoInfo.duration,
            thumbnail: videoInfo.thumbnail
          });
        } catch (infoError) {
          // Retorna apenas a URL se não conseguir as informações
          resolve({
            streamUrl,
            videoId: this.extractVideoId(url) || videoId,
            title: null,
            duration: null,
            thumbnail: null
          });
        }
      });

      process.on('error', (error) => {
        reject(new Error('Erro ao executar yt-dlp: ' + error.message));
      });
    });
  }

  /**
   * Extrai o ID do vídeo de uma URL do YouTube
   * @param {string} url - URL do YouTube
   * @returns {string|null} - ID do vídeo ou null
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}

export default new YoutubeService();
