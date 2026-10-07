import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { getSecurityConfig } from '../config/security.js';

const require = createRequire(import.meta.url);

let jwt = null;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  jwt = null;
}

/**
 * Sign JWT or lightweight HMAC token
 */
export function signToken(payload) {
  const config = getSecurityConfig();
  if (jwt) {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: `${config.sessionExpiryHours || 12}h` });
  }

  // Pure crypto fallback
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + (config.sessionExpiryHours || 12) * 3600 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', config.jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verify JWT or lightweight HMAC token
 */
export function verifyToken(token) {
  if (!token) return null;
  const config = getSecurityConfig();

  if (jwt) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (e) {
      return null;
    }
  }

  // Pure crypto fallback
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', config.jwtSecret).update(`${header}.${body}`).digest('base64url');
    if (sig !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Express middleware to protect admin endpoints
 */
export function requireAdmin(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  req.admin = decoded;
  next();
}

