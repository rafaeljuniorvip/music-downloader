import { readdir, stat, unlink, access } from 'fs/promises';
import { constants } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOWNLOADS_DIR = join(__dirname, '../../downloads');

class FilesService {
  /**
   * Lista todos os arquivos da pasta de downloads com metadados
   * @returns {Promise<Array>} Lista de arquivos com size, date, name
   */
  async listFiles() {
    try {
      await this.ensureDownloadsDirExists();

      const files = await readdir(DOWNLOADS_DIR);
      const fileList = [];

      for (const file of files) {
        const filePath = join(DOWNLOADS_DIR, file);
        try {
          const stats = await stat(filePath);
          if (stats.isFile()) {
            fileList.push({
              name: file,
              size: stats.size,
              sizeFormatted: this.formatBytes(stats.size),
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              extension: extname(file).toLowerCase()
            });
          }
        } catch (err) {
          // Ignora arquivos que não podem ser lidos
          console.error(`Erro ao ler arquivo ${file}:`, err.message);
        }
      }

      // Ordena por data de modificação (mais recentes primeiro)
      fileList.sort((a, b) => b.modifiedAt - a.modifiedAt);

      return fileList;
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      throw error;
    }
  }

  /**
   * Deleta um arquivo específico
   * @param {string} filename - Nome do arquivo a ser deletado
   * @returns {Promise<boolean>} true se deletado com sucesso
   */
  async deleteFile(filename) {
    try {
      // Sanitiza o nome do arquivo para evitar path traversal
      const safeName = basename(filename);
      const filePath = join(DOWNLOADS_DIR, safeName);

      // Verifica se o arquivo existe
      await access(filePath, constants.F_OK);

      // Deleta o arquivo
      await unlink(filePath);

      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Arquivo não encontrado');
      }
      console.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  }

  /**
   * Retorna informações detalhadas de um arquivo
   * @param {string} filename - Nome do arquivo
   * @returns {Promise<Object>} Metadados do arquivo
   */
  async getFileInfo(filename) {
    try {
      // Sanitiza o nome do arquivo para evitar path traversal
      const safeName = basename(filename);
      const filePath = join(DOWNLOADS_DIR, safeName);

      // Verifica se o arquivo existe
      await access(filePath, constants.F_OK);

      const stats = await stat(filePath);

      // Busca informações no banco de dados
      const dbInfo = await this.getFileDbInfo(safeName);

      return {
        name: safeName,
        path: filePath,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        accessedAt: stats.atime,
        extension: extname(safeName).toLowerCase(),
        isFile: stats.isFile(),
        // Informações do banco de dados (se disponíveis)
        database: dbInfo
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Arquivo não encontrado');
      }
      console.error('Erro ao obter informações do arquivo:', error);
      throw error;
    }
  }

  /**
   * Calcula o tamanho total usado pela pasta de downloads
   * @returns {Promise<Object>} Tamanho total e formatado
   */
  async getTotalSize() {
    try {
      await this.ensureDownloadsDirExists();

      const files = await readdir(DOWNLOADS_DIR);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        const filePath = join(DOWNLOADS_DIR, file);
        try {
          const stats = await stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
            fileCount++;
          }
        } catch (err) {
          // Ignora arquivos que não podem ser lidos
        }
      }

      return {
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        fileCount
      };
    } catch (error) {
      console.error('Erro ao calcular tamanho total:', error);
      throw error;
    }
  }

  /**
   * Remove arquivos órfãos (que não estão no banco de dados)
   * @returns {Promise<Object>} Resultado da limpeza
   */
  async cleanOrphans() {
    try {
      await this.ensureDownloadsDirExists();

      const files = await readdir(DOWNLOADS_DIR);
      const deletedFiles = [];
      let freedSpace = 0;

      // Busca todos os file_path do banco de dados
      const result = await db.query(
        `SELECT file_path FROM downloads WHERE file_path IS NOT NULL AND status = 'completed'`
      );

      // Extrai apenas os nomes dos arquivos do banco
      const dbFilenames = new Set(
        result.rows
          .map(row => row.file_path ? basename(row.file_path) : null)
          .filter(Boolean)
      );

      for (const file of files) {
        const filePath = join(DOWNLOADS_DIR, file);

        try {
          const stats = await stat(filePath);

          if (stats.isFile() && !dbFilenames.has(file)) {
            // Arquivo não está no banco de dados - é órfão
            const fileSize = stats.size;
            await unlink(filePath);

            deletedFiles.push({
              name: file,
              size: fileSize,
              sizeFormatted: this.formatBytes(fileSize)
            });

            freedSpace += fileSize;
          }
        } catch (err) {
          console.error(`Erro ao processar arquivo ${file}:`, err.message);
        }
      }

      return {
        deletedCount: deletedFiles.length,
        deletedFiles,
        freedSpace,
        freedSpaceFormatted: this.formatBytes(freedSpace)
      };
    } catch (error) {
      console.error('Erro ao limpar arquivos órfãos:', error);
      throw error;
    }
  }

  /**
   * Busca informações de um arquivo no banco de dados
   * @param {string} filename - Nome do arquivo
   * @returns {Promise<Object|null>} Informações do banco ou null
   */
  async getFileDbInfo(filename) {
    try {
      const result = await db.query(
        `SELECT id, url, title, status, channel, file_size, created_at, finished_at
         FROM downloads
         WHERE file_path LIKE $1
         ORDER BY finished_at DESC
         LIMIT 1`,
        [`%${filename}`]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar info do arquivo no banco:', error);
      return null;
    }
  }

  /**
   * Verifica se a pasta de downloads existe
   */
  async ensureDownloadsDirExists() {
    try {
      await access(DOWNLOADS_DIR, constants.F_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Pasta de downloads não existe');
      }
      throw error;
    }
  }

  /**
   * Formata bytes para formato legível
   * @param {number} bytes - Tamanho em bytes
   * @returns {string} Tamanho formatado
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new FilesService();
