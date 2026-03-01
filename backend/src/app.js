import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import downloadRoutes from './routes/download.routes.js';
import statisticsRoutes from './routes/statistics.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import filesRoutes from './routes/files.routes.js';
import searchRoutes from './routes/search.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import apikeysRoutes from './routes/apikeys.routes.js';
import v1Routes from './routes/v1.routes.js';
import { initDatabase } from './config/database.js';
import settingsService from './services/settings.service.js';
import { requireAuth } from './middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8765;

// Inicializa banco de dados e configuracoes
initDatabase()
  .then(() => settingsService.initializeDefaults())
  .catch(err => {
    console.error('Erro ao inicializar banco de dados:', err);
    process.exit(1);
  });

// CORS - permite requisicoes do frontend
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://downytube.papelaria.vip',
      'https://api.downytube.papelaria.vip'
    ]
  : [
      'http://localhost:8766',
      'http://localhost:8765',
      'http://127.0.0.1:8766',
      'http://127.0.0.1:8765'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos da pasta downloads
app.use('/downloads', express.static(join(__dirname, '../downloads')));

// Rota de health check (publica)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Music Downloader API is running',
    timestamp: new Date().toISOString()
  });
});

// Rotas publicas (auth)
app.use('/api', authRoutes);

// Rotas externas protegidas por API key
app.use('/api', v1Routes);

// Rotas protegidas por JWT (requerem login + aprovacao)
app.use('/api', requireAuth, downloadRoutes);
app.use('/api/statistics', requireAuth, statisticsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/files', requireAuth, filesRoutes);
app.use('/api/search', requireAuth, searchRoutes);

// Rotas admin (auth + admin check interno nas rotas)
app.use('/api', usersRoutes);
app.use('/api', apikeysRoutes);

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada'
  });
});

// Tratamento de erros globais
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎵 Music Downloader Backend                              ║
║   Servidor rodando na porta ${PORT}                          ║
║   http://localhost:${PORT}                                   ║
║                                                            ║
║   Endpoints:                                               ║
║   POST   /api/download/add         - Adicionar a fila      ║
║   GET    /api/download/queue       - Listar fila           ║
║   POST   /api/download/:id/pause   - Pausar download       ║
║   POST   /api/download/:id/resume  - Continuar download    ║
║   DELETE /api/download/:id         - Cancelar/remover      ║
║   GET    /api/download/progress    - SSE progresso         ║
║   GET    /api/history              - Historico             ║
║   GET    /api/settings             - Listar configuracoes  ║
║   PUT    /api/settings             - Atualizar config      ║
║   POST   /api/settings/reset       - Restaurar padrao      ║
║   GET    /api/statistics           - Estatisticas          ║
║   GET    /api/statistics/summary   - Resumo dashboard      ║
║   GET    /api/files                - Listar arquivos       ║
║   DELETE /api/files/:filename      - Deletar arquivo       ║
║   GET    /api/files/:filename/info - Info do arquivo       ║
║   POST   /api/files/cleanup        - Limpar orfaos         ║
║   GET    /api/search               - Pesquisar YouTube     ║
║   GET    /api/search/cache/stats   - Stats do cache        ║
║   DELETE /api/search/cache         - Limpar cache          ║
║   GET    /api/health               - Health check          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
