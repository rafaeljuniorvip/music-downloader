import db from '../config/database.js';

class HistoryService {
  /**
   * Adiciona novo registro ao histórico
   */
  async add({ id, url, title, type = 'video', playlistId = null, channel = null }) {
    const result = await db.query(
      `INSERT INTO downloads (id, url, title, status, type, playlist_id, channel)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING *`,
      [id, url, title, type, playlistId, channel]
    );
    return result.rows[0];
  }

  /**
   * Atualiza status de um download
   */
  async updateStatus(id, status, filePath = null, errorMessage = null) {
    let sql = 'UPDATE downloads SET status = $1';
    const params = [status];
    let paramIndex = 2;

    if (filePath) {
      sql += `, file_path = $${paramIndex}`;
      params.push(filePath);
      paramIndex++;
    }

    if (errorMessage) {
      sql += `, error_message = $${paramIndex}`;
      params.push(errorMessage);
      paramIndex++;
    }

    if (status === 'completed' || status === 'error' || status === 'cancelled') {
      sql += ', finished_at = CURRENT_TIMESTAMP';
    }

    sql += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    const result = await db.query(sql, params);
    return result.rows[0];
  }

  /**
   * Atualiza progresso de um download
   */
  async updateProgress(id, progress) {
    const result = await db.query(
      'UPDATE downloads SET progress = $1 WHERE id = $2 RETURNING *',
      [progress, id]
    );
    return result.rows[0];
  }

  /**
   * Atualiza título de um download
   */
  async updateTitle(id, title) {
    const result = await db.query(
      'UPDATE downloads SET title = $1 WHERE id = $2 RETURNING *',
      [title, id]
    );
    return result.rows[0];
  }

  /**
   * Atualiza informacoes do canal/uploader
   */
  async updateChannel(id, channel) {
    const result = await db.query(
      'UPDATE downloads SET channel = $1 WHERE id = $2 RETURNING *',
      [channel, id]
    );
    return result.rows[0];
  }

  /**
   * Atualiza tamanho do arquivo
   */
  async updateFileSize(id, fileSize) {
    const result = await db.query(
      'UPDATE downloads SET file_size = $1 WHERE id = $2 RETURNING *',
      [fileSize, id]
    );
    return result.rows[0];
  }

  /**
   * Atualiza velocidade de download
   */
  async updateDownloadSpeed(id, speed) {
    const result = await db.query(
      'UPDATE downloads SET download_speed = $1 WHERE id = $2 RETURNING *',
      [speed, id]
    );
    return result.rows[0];
  }

  /**
   * Atualiza estatisticas completas de um download
   */
  async updateStats(id, { fileSize = null, downloadSpeed = null, channel = null }) {
    let sql = 'UPDATE downloads SET ';
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (fileSize !== null) {
      updates.push(`file_size = $${paramIndex}`);
      params.push(fileSize);
      paramIndex++;
    }

    if (downloadSpeed !== null) {
      updates.push(`download_speed = $${paramIndex}`);
      params.push(downloadSpeed);
      paramIndex++;
    }

    if (channel !== null) {
      updates.push(`channel = $${paramIndex}`);
      params.push(channel);
      paramIndex++;
    }

    if (updates.length === 0) {
      return null;
    }

    sql += updates.join(', ');
    sql += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    const result = await db.query(sql, params);
    return result.rows[0];
  }

  /**
   * Busca registro por ID
   */
  async getById(id) {
    const result = await db.query('SELECT * FROM downloads WHERE id = $1', [id]);
    return result.rows[0];
  }

  /**
   * Busca registro por URL
   * Retorna o registro mais recente com esta URL
   */
  async findByUrl(url) {
    const result = await db.query(
      `SELECT * FROM downloads
       WHERE url = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [url]
    );
    return result.rows[0] || null;
  }

  /**
   * Verifica se URL já foi baixada com sucesso
   */
  async wasDownloadedSuccessfully(url) {
    const result = await db.query(
      `SELECT id, title, created_at, finished_at FROM downloads
       WHERE url = $1 AND status = 'completed'
       ORDER BY finished_at DESC
       LIMIT 1`,
      [url]
    );
    return result.rows[0] || null;
  }

  /**
   * Verifica se URL está na fila ativa (pending ou downloading)
   */
  async existsInQueue(url) {
    const result = await db.query(
      `SELECT id, title, status, created_at FROM downloads
       WHERE url = $1 AND status IN ('pending', 'downloading', 'paused')
       ORDER BY created_at DESC
       LIMIT 1`,
      [url]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca histórico com filtros
   */
  async getHistory({ status, type, search, limit = 50, offset = 0, orderBy = 'created_at', order = 'DESC' } = {}) {
    let sql = 'SELECT * FROM downloads WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (title ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Validação do orderBy para evitar SQL injection
    const allowedOrderBy = ['created_at', 'finished_at', 'title', 'status'];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'created_at';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${safeOrderBy} ${safeOrder}`;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(sql, params);
    return result.rows;
  }

  /**
   * Conta total de registros com filtros
   */
  async count({ status, type, search } = {}) {
    let sql = 'SELECT COUNT(*) as total FROM downloads WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (title ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await db.query(sql, params);
    return parseInt(result.rows[0].total);
  }

  /**
   * Busca downloads de uma playlist
   */
  async getByPlaylist(playlistId) {
    const result = await db.query(
      `SELECT * FROM downloads
       WHERE playlist_id = $1
       ORDER BY created_at ASC`,
      [playlistId]
    );
    return result.rows;
  }

  /**
   * Retorna estatísticas gerais
   */
  async getStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'downloading' THEN 1 ELSE 0 END) as downloading
      FROM downloads
    `);
    return result.rows[0];
  }

  /**
   * Remove registro do histórico
   */
  async delete(id) {
    const result = await db.query('DELETE FROM downloads WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * Limpa histórico antigo
   */
  async clearOld(daysOld = 30) {
    const result = await db.query(
      `DELETE FROM downloads
       WHERE created_at < NOW() - INTERVAL '${daysOld} days'
       AND status IN ('completed', 'error', 'cancelled')`
    );
    return result.rowCount;
  }

  /**
   * Limpa todo o histórico (exceto pendentes/em andamento)
   */
  async clearAll() {
    const result = await db.query(
      `DELETE FROM downloads
       WHERE status IN ('completed', 'error', 'cancelled')`
    );
    return result.rowCount;
  }
}

export default new HistoryService();
