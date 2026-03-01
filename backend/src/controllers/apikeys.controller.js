import apikeyService from '../services/apikey.service.js';

export const apikeysController = {
  async list(req, res) {
    try {
      const keys = await apikeyService.list();
      res.json({ success: true, keys });
    } catch (err) {
      console.error('Erro ao listar API keys:', err);
      res.status(500).json({ success: false, error: 'Erro ao listar API keys' });
    }
  },

  async create(req, res) {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
      }
      // Create key for the admin user making the request
      const result = await apikeyService.create(name, req.user.userId);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('Erro ao criar API key:', err);
      res.status(500).json({ success: false, error: 'Erro ao criar API key' });
    }
  },

  async revoke(req, res) {
    try {
      const key = await apikeyService.revoke(req.params.id);
      if (!key) {
        return res.status(404).json({ success: false, error: 'API key não encontrada' });
      }
      res.json({ success: true, message: 'API key revogada' });
    } catch (err) {
      console.error('Erro ao revogar API key:', err);
      res.status(500).json({ success: false, error: 'Erro ao revogar API key' });
    }
  },
};
