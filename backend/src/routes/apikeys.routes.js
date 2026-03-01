import { Router } from 'express';
import { apikeysController } from '../controllers/apikeys.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require auth + admin
router.use(requireAuth, requireAdmin);

router.get('/api-keys', apikeysController.list);
router.post('/api-keys', apikeysController.create);
router.delete('/api-keys/:id', apikeysController.revoke);

export default router;
