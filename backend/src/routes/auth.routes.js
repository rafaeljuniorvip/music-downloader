import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Public - Google login
router.post('/auth/google', authController.googleLogin);

// Requires token (but not approved) - get current user data
router.get('/auth/me', requireToken, authController.me);

export default router;
