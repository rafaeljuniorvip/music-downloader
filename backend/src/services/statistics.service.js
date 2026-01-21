import db from '../config/database.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, statSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOWNLOADS_DIR = join(__dirname, '../../downloads');

class StatisticsService {
  /**
   * Retorna estatísticas totais do sistema
   * Total de downloads, completados, falhas, armazenamento usado
   */
  async getTotalStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_downloads,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'downloading' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
        SUM(COALESCE(file_size, 0)) as total_file_size,
        AVG(CASE WHEN download_speed > 0 THEN download_speed ELSE NULL END) as avg_speed,
        MIN(created_at) as first_download,
        MAX(created_at) as last_download
      FROM downloads
    `);

    const stats = result.rows[0];

    // Calcula armazenamento real da pasta de downloads
    const storageUsed = this.calculateStorageUsed();

    return {
      totalDownloads: parseInt(stats.total_downloads) || 0,
      completed: parseInt(stats.completed) || 0,
      failed: parseInt(stats.failed) || 0,
      cancelled: parseInt(stats.cancelled) || 0,
      pending: parseInt(stats.pending) || 0,
      inProgress: parseInt(stats.in_progress) || 0,
      paused: parseInt(stats.paused) || 0,
      totalFileSize: parseInt(stats.total_file_size) || 0,
      storageUsed: storageUsed,
      averageSpeed: parseFloat(stats.avg_speed) || 0,
      firstDownload: stats.first_download,
      lastDownload: stats.last_download
    };
  }

  /**
   * Retorna downloads agrupados por período (dia/semana/mês)
   * @param {string} period - 'day', 'week' ou 'month'
   * @param {number} limit - número de períodos a retornar
   */
  async getDownloadsByPeriod(period = 'day', limit = 30) {
    let dateFormat;
    let interval;

    switch (period) {
      case 'week':
        dateFormat = 'IYYY-IW'; // ISO year-week
        interval = `${limit} weeks`;
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        interval = `${limit} months`;
        break;
      case 'day':
      default:
        dateFormat = 'YYYY-MM-DD';
        interval = `${limit} days`;
        break;
    }

    const result = await db.query(`
      SELECT
        TO_CHAR(created_at, $1) as period,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
        SUM(COALESCE(file_size, 0)) as total_size
      FROM downloads
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY TO_CHAR(created_at, $1)
      ORDER BY period DESC
      LIMIT $2
    `, [dateFormat, limit]);

    return result.rows.map(row => ({
      period: row.period,
      total: parseInt(row.total) || 0,
      completed: parseInt(row.completed) || 0,
      failed: parseInt(row.failed) || 0,
      totalSize: parseInt(row.total_size) || 0
    }));
  }

  /**
   * Retorna os canais/uploaders mais baixados
   * @param {number} limit - número de resultados
   */
  async getTopSources(limit = 10) {
    const result = await db.query(`
      SELECT
        COALESCE(channel, 'Desconhecido') as channel,
        COUNT(*) as download_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(COALESCE(file_size, 0)) as total_size
      FROM downloads
      WHERE channel IS NOT NULL AND channel != ''
      GROUP BY channel
      ORDER BY download_count DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      channel: row.channel,
      downloadCount: parseInt(row.download_count) || 0,
      completed: parseInt(row.completed) || 0,
      totalSize: parseInt(row.total_size) || 0
    }));
  }

  /**
   * Retorna a velocidade média de download
   */
  async getAverageSpeed() {
    const result = await db.query(`
      SELECT
        AVG(download_speed) as avg_speed,
        MIN(download_speed) as min_speed,
        MAX(download_speed) as max_speed,
        COUNT(CASE WHEN download_speed > 0 THEN 1 END) as samples
      FROM downloads
      WHERE download_speed > 0
    `);

    const stats = result.rows[0];

    return {
      averageSpeed: parseFloat(stats.avg_speed) || 0,
      minSpeed: parseFloat(stats.min_speed) || 0,
      maxSpeed: parseFloat(stats.max_speed) || 0,
      samples: parseInt(stats.samples) || 0
    };
  }

  /**
   * Retorna a taxa de sucesso dos downloads
   */
  async getSuccessRate() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM downloads
      WHERE status IN ('completed', 'error', 'cancelled')
    `);

    const stats = result.rows[0];
    const total = parseInt(stats.total) || 0;
    const completed = parseInt(stats.completed) || 0;
    const failed = parseInt(stats.failed) || 0;
    const cancelled = parseInt(stats.cancelled) || 0;

    const successRate = total > 0 ? (completed / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;
    const cancelRate = total > 0 ? (cancelled / total) * 100 : 0;

    return {
      total,
      completed,
      failed,
      cancelled,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      cancelRate: Math.round(cancelRate * 100) / 100
    };
  }

  /**
   * Retorna estatísticas por tipo de download (video/playlist)
   */
  async getStatsByType() {
    const result = await db.query(`
      SELECT
        type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
        SUM(COALESCE(file_size, 0)) as total_size
      FROM downloads
      GROUP BY type
    `);

    return result.rows.map(row => ({
      type: row.type || 'video',
      total: parseInt(row.total) || 0,
      completed: parseInt(row.completed) || 0,
      failed: parseInt(row.failed) || 0,
      totalSize: parseInt(row.total_size) || 0
    }));
  }

  /**
   * Retorna downloads recentes com erros para análise
   * @param {number} limit - número de resultados
   */
  async getRecentErrors(limit = 10) {
    const result = await db.query(`
      SELECT
        id,
        title,
        url,
        error_message,
        created_at,
        finished_at
      FROM downloads
      WHERE status = 'error'
      ORDER BY finished_at DESC NULLS LAST, created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Retorna tempo médio de download
   */
  async getAverageDownloadTime() {
    const result = await db.query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (finished_at - created_at))) as avg_seconds,
        MIN(EXTRACT(EPOCH FROM (finished_at - created_at))) as min_seconds,
        MAX(EXTRACT(EPOCH FROM (finished_at - created_at))) as max_seconds,
        COUNT(*) as samples
      FROM downloads
      WHERE status = 'completed'
        AND finished_at IS NOT NULL
        AND created_at IS NOT NULL
    `);

    const stats = result.rows[0];

    return {
      averageSeconds: Math.round(parseFloat(stats.avg_seconds) || 0),
      minSeconds: Math.round(parseFloat(stats.min_seconds) || 0),
      maxSeconds: Math.round(parseFloat(stats.max_seconds) || 0),
      samples: parseInt(stats.samples) || 0
    };
  }

  /**
   * Calcula armazenamento usado na pasta de downloads
   */
  calculateStorageUsed() {
    try {
      if (!existsSync(DOWNLOADS_DIR)) {
        return 0;
      }

      const files = readdirSync(DOWNLOADS_DIR);
      let totalSize = 0;

      for (const file of files) {
        const filePath = join(DOWNLOADS_DIR, file);
        try {
          const stats = statSync(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch (err) {
          // Ignora arquivos que não podem ser lidos
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Erro ao calcular armazenamento:', error);
      return 0;
    }
  }

  /**
   * Retorna resumo rápido para dashboard
   */
  async getSummary() {
    const [totalStats, successRate, downloadTime] = await Promise.all([
      this.getTotalStats(),
      this.getSuccessRate(),
      this.getAverageDownloadTime()
    ]);

    return {
      totalDownloads: totalStats.totalDownloads,
      completed: totalStats.completed,
      failed: totalStats.failed,
      inProgress: totalStats.inProgress + totalStats.pending + totalStats.paused,
      storageUsed: totalStats.storageUsed,
      successRate: successRate.successRate,
      averageDownloadTime: downloadTime.averageSeconds
    };
  }

  /**
   * Retorna estatísticas completas
   */
  async getComprehensiveStats() {
    const [
      totalStats,
      downloadsByDay,
      downloadsByWeek,
      downloadsByMonth,
      topSources,
      speedStats,
      successRate,
      statsByType,
      recentErrors,
      downloadTime
    ] = await Promise.all([
      this.getTotalStats(),
      this.getDownloadsByPeriod('day', 7),
      this.getDownloadsByPeriod('week', 4),
      this.getDownloadsByPeriod('month', 6),
      this.getTopSources(10),
      this.getAverageSpeed(),
      this.getSuccessRate(),
      this.getStatsByType(),
      this.getRecentErrors(5),
      this.getAverageDownloadTime()
    ]);

    return {
      total: totalStats,
      timeline: {
        daily: downloadsByDay,
        weekly: downloadsByWeek,
        monthly: downloadsByMonth
      },
      topSources,
      speed: speedStats,
      successRate,
      byType: statsByType,
      recentErrors,
      downloadTime
    };
  }
}

export default new StatisticsService();
