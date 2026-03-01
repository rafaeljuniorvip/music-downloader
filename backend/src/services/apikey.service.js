import crypto from 'crypto';
import pool from '../config/database.js';

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

const apikeyService = {
  generate(name, userId) {
    // Generate a random API key: dk_<32 hex chars>
    const raw = 'dk_' + crypto.randomBytes(32).toString('hex');
    const prefix = raw.substring(0, 12);
    const keyHash = hashKey(raw);
    return { raw, prefix, keyHash, name, userId };
  },

  async create(name, userId) {
    const { raw, prefix, keyHash } = this.generate(name, userId);
    await pool.query(
      `INSERT INTO api_keys (name, key_hash, key_prefix, user_id)
       VALUES ($1, $2, $3, $4)`,
      [name, keyHash, prefix, userId]
    );
    // Return raw key only once - it cannot be retrieved later
    return { key: raw, prefix, name };
  },

  async validate(apiKey) {
    const keyHash = hashKey(apiKey);
    const result = await pool.query(
      `SELECT ak.*, u.email, u.role, u.approved FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1 AND ak.active = true
       AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)`,
      [keyHash]
    );
    if (result.rows.length === 0) return null;

    // Update last_used
    const key = result.rows[0];
    await pool.query(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
      [key.id]
    );
    return key;
  },

  async list() {
    const result = await pool.query(
      `SELECT ak.id, ak.name, ak.key_prefix, ak.active, ak.created_at, ak.last_used, ak.expires_at,
              u.email as user_email, u.name as user_name
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       ORDER BY ak.created_at DESC`
    );
    return result.rows;
  },

  async revoke(id) {
    const result = await pool.query(
      'UPDATE api_keys SET active = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query(
      'DELETE FROM api_keys WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },
};

export default apikeyService;
