import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const authService = {
  async verifyGoogleToken(credential) {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub,
    };
  },

  async findOrCreateUser({ email, name, picture, googleId }) {
    // Try to find existing user
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      // Update google_id, name, picture, last_login
      const user = existing.rows[0];
      await pool.query(
        `UPDATE users SET google_id = COALESCE($1, google_id), name = COALESCE($2, name),
         picture = COALESCE($3, picture), last_login = CURRENT_TIMESTAMP WHERE id = $4`,
        [googleId, name, picture, user.id]
      );
      return { ...user, name: name || user.name, picture: picture || user.picture, google_id: googleId || user.google_id };
    }

    // Create new user (not approved by default)
    const result = await pool.query(
      `INSERT INTO users (email, name, picture, google_id, last_login)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
      [email, name, picture, googleId]
    );
    return result.rows[0];
  },

  signJWT(user) {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role, approved: user.approved },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  },

  verifyJWT(token) {
    return jwt.verify(token, JWT_SECRET);
  },

  async getUserById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async listUsers() {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  },

  async approveUser(id) {
    const result = await pool.query(
      'UPDATE users SET approved = true WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },

  async deleteUser(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },

  async updateUserRole(id, role) {
    if (!['admin', 'user'].includes(role)) {
      throw new Error('Role inválido');
    }
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
      [role, id]
    );
    return result.rows[0] || null;
  },
};

export default authService;
