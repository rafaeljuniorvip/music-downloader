import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'music_downloader',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
});

// Testa conexão
pool.on('connect', () => {
  console.log('PostgreSQL conectado');
});

pool.on('error', (err) => {
  console.error('Erro no PostgreSQL:', err);
});

// Inicializa o banco de dados
export async function initDatabase() {
  const client = await pool.connect();

  try {
    // Cria tabela de downloads se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS downloads (
        id VARCHAR(36) PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        file_path TEXT,
        error_message TEXT,
        type VARCHAR(20) DEFAULT 'video',
        playlist_id VARCHAR(36),
        progress INTEGER DEFAULT 0
      )
    `);

    // Cria indices para melhor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_downloads_playlist_id ON downloads(playlist_id);
    `);

    // Adiciona colunas para estatisticas (se nao existirem)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'file_size') THEN
          ALTER TABLE downloads ADD COLUMN file_size BIGINT DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'download_speed') THEN
          ALTER TABLE downloads ADD COLUMN download_speed FLOAT DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloads' AND column_name = 'channel') THEN
          ALTER TABLE downloads ADD COLUMN channel VARCHAR(255);
        END IF;
      END $$;
    `);

    // Cria indice para channel (top sources)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_downloads_channel ON downloads(channel);
    `);

    // Cria tabela de configuracoes
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT,
        type VARCHAR(20) DEFAULT 'string',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tabelas criadas/verificadas com sucesso');
  } finally {
    client.release();
  }
}

export default pool;
