import filesService from '../services/files.service.js';

export const filesController = {
  /**
   * GET /api/files
   * Lista todos os arquivos na pasta de downloads
   */
  async list(req, res) {
    try {
      const files = await filesService.listFiles();
      const totalSize = await filesService.getTotalSize();

      res.json({
        success: true,
        data: {
          files,
          total: files.length,
          totalSize: totalSize.totalSize,
          totalSizeFormatted: totalSize.totalSizeFormatted
        }
      });
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar arquivos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * DELETE /api/files/:filename
   * Deleta um arquivo específico
   */
  async deleteFile(req, res) {
    try {
      const { filename } = req.params;

      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Nome do arquivo é obrigatório'
        });
      }

      await filesService.deleteFile(filename);

      res.json({
        success: true,
        message: `Arquivo '${filename}' deletado com sucesso`
      });
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);

      if (error.message === 'Arquivo não encontrado') {
        return res.status(404).json({
          success: false,
          error: 'Arquivo não encontrado'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro ao deletar arquivo',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/files/:filename/info
   * Retorna informações detalhadas de um arquivo
   */
  async getInfo(req, res) {
    try {
      const { filename } = req.params;

      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Nome do arquivo é obrigatório'
        });
      }

      const info = await filesService.getFileInfo(filename);

      res.json({
        success: true,
        data: info
      });
    } catch (error) {
      console.error('Erro ao obter info do arquivo:', error);

      if (error.message === 'Arquivo não encontrado') {
        return res.status(404).json({
          success: false,
          error: 'Arquivo não encontrado'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro ao obter informações do arquivo',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * POST /api/files/cleanup
   * Remove arquivos órfãos (não presentes no banco de dados)
   */
  async cleanup(req, res) {
    try {
      const result = await filesService.cleanOrphans();

      res.json({
        success: true,
        message: result.deletedCount > 0
          ? `${result.deletedCount} arquivo(s) órfão(s) removido(s)`
          : 'Nenhum arquivo órfão encontrado',
        data: result
      });
    } catch (error) {
      console.error('Erro ao limpar arquivos órfãos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao limpar arquivos órfãos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * GET /api/files/storage
   * Retorna informações de armazenamento
   */
  async getStorage(req, res) {
    try {
      const storage = await filesService.getTotalSize();

      res.json({
        success: true,
        data: storage
      });
    } catch (error) {
      console.error('Erro ao obter armazenamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter informações de armazenamento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};
