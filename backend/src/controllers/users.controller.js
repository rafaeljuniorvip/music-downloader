import authService from '../services/auth.service.js';

export const usersController = {
  async list(req, res) {
    try {
      const users = await authService.listUsers();
      res.json({ success: true, users });
    } catch (err) {
      console.error('Erro ao listar usuários:', err);
      res.status(500).json({ success: false, error: 'Erro ao listar usuários' });
    }
  },

  async approve(req, res) {
    try {
      const user = await authService.approveUser(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }
      res.json({ success: true, user });
    } catch (err) {
      console.error('Erro ao aprovar usuário:', err);
      res.status(500).json({ success: false, error: 'Erro ao aprovar usuário' });
    }
  },

  async remove(req, res) {
    try {
      const user = await authService.deleteUser(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }
      res.json({ success: true, message: 'Usuário removido' });
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      res.status(500).json({ success: false, error: 'Erro ao remover usuário' });
    }
  },

  async updateRole(req, res) {
    try {
      const { role } = req.body;
      const user = await authService.updateUserRole(req.params.id, role);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }
      res.json({ success: true, user });
    } catch (err) {
      console.error('Erro ao alterar role:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  },
};
