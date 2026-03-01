import authService from '../services/auth.service.js';
import apikeyService from '../services/apikey.service.js';

// Requires valid JWT and user must be approved
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }

  try {
    const decoded = authService.verifyJWT(token);
    if (!decoded.approved) {
      return res.status(403).json({ success: false, error: 'Usuário aguardando aprovação' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
}

// Requires valid JWT but does NOT check approved status
// Used for /me endpoint so pending users can check their status
export function requireToken(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }

  try {
    const decoded = authService.verifyJWT(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
}

// Requires x-api-key header with valid API key
export async function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key não fornecida' });
  }

  try {
    const keyData = await apikeyService.validate(apiKey);
    if (!keyData) {
      return res.status(401).json({ success: false, error: 'API key inválida ou expirada' });
    }
    req.apiKey = keyData;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erro ao validar API key' });
  }
}

// Requires user to have admin role (use after requireAuth)
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });
  }
  next();
}

// Extract token from Authorization header or query param (for SSE)
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Fallback to query param (needed for EventSource which can't set headers)
  if (req.query.token) {
    return req.query.token;
  }
  return null;
}
