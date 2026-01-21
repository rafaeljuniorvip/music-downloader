import { Router } from 'express';
import { filesController } from '../controllers/files.controller.js';

const router = Router();

// GET /api/files - Lista todos os arquivos
router.get('/', filesController.list);

// GET /api/files/storage - Informações de armazenamento
router.get('/storage', filesController.getStorage);

// POST /api/files/cleanup - Limpa arquivos órfãos
router.post('/cleanup', filesController.cleanup);

// GET /api/files/:filename/info - Informações detalhadas de um arquivo
router.get('/:filename/info', filesController.getInfo);

// DELETE /api/files/:filename - Deleta um arquivo
router.delete('/:filename', filesController.deleteFile);

export default router;
