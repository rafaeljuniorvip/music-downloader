import { Router } from 'express';
import { usersController } from '../controllers/users.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require auth + admin
router.use(requireAuth, requireAdmin);

router.get('/users', usersController.list);
router.post('/users/:id/approve', usersController.approve);
router.delete('/users/:id', usersController.remove);
router.put('/users/:id/role', usersController.updateRole);

export default router;
