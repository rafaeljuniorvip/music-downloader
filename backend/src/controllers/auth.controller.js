import authService from '../services/auth.service.js';

export const authController = {
  async googleLogin(req, res) {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ success: false, error: 'Credential não fornecido' });
      }

      // Verify Google ID token
      const googleUser = await authService.verifyGoogleToken(credential);

      // Find or create user in database
      const user = await authService.findOrCreateUser(googleUser);

      // Sign JWT
      const token = authService.signJWT(user);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          role: user.role,
          approved: user.approved,
        },
      });
    } catch (err) {
      console.error('Erro no login Google:', err);
      res.status(401).json({ success: false, error: 'Falha na autenticação com Google' });
    }
  },

  async me(req, res) {
    try {
      // req.user comes from requireToken middleware (JWT decoded)
      const user = await authService.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }

      // Return fresh JWT with updated data
      const token = authService.signJWT(user);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          role: user.role,
          approved: user.approved,
        },
      });
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  },
};
