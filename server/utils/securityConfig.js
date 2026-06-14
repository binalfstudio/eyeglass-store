const crypto = require('crypto');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set and at least 32 characters in production');
    }
    console.warn(
      '[SECURITY] Using development JWT secret. Set JWT_SECRET (32+ chars) before production.'
    );
    return 'dev-only-change-me-before-production-32chars!!';
  }
  return secret;
};

const getAdminRegistrationKey = () =>
  process.env.ADMIN_REGISTRATION_KEY || process.env.ADMIN_KEY || '';

const getMysqlConfig = () => ({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'eyeglass_db',
});

const getAllowedClientOrigins = () => {
  const origins = new Set(
    [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:3000',
    ].filter(Boolean)
  );
  return origins;
};

const isLocalOrigin = (origin) => {
  if (typeof origin !== 'string') return false;
  return /^http:\/\/(localhost|127\.0\.0\.1):(\d+)$/.test(origin);
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const allowed = getAllowedClientOrigins();
  if (allowed.has(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && isLocalOrigin(origin)) return true;
  return false;
};

const isAllowedRedirectUrl = (rawUrl, requestOrigin) => {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false;

  const allowed = getAllowedClientOrigins();
  const origin = requestOrigin || process.env.CLIENT_URL || 'http://localhost:5174';

  let clientOrigin;
  try {
    clientOrigin = new URL(origin).origin;
  } catch {
    return false;
  }

  if (parsed.origin === clientOrigin) return true;
  if (allowed.has(parsed.origin)) return true;
  if (process.env.NODE_ENV !== 'production' && isLocalOrigin(parsed.origin)) return true;

  return false;
};

const timingSafeEqualStrings = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const verifyWebhookSecret = (req) => {
  const configured = process.env.CHAPA_WEBHOOK_SECRET || '';
  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return true;
  }

  const provided =
    req.headers['x-webhook-secret'] ||
    req.headers['x-chapa-signature'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  return timingSafeEqualStrings(String(provided || ''), configured);
};

const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, '')
    .trim();

const sanitizeObject = (input) => {
  if (!input || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map(sanitizeObject);

  const clean = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    if (typeof value === 'string') {
      clean[key] = stripHtml(value);
    } else if (value && typeof value === 'object') {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

module.exports = {
  getJwtSecret,
  getAdminRegistrationKey,
  getMysqlConfig,
  getAllowedClientOrigins,
  isLocalOrigin,
  isOriginAllowed,
  isAllowedRedirectUrl,
  verifyWebhookSecret,
  sanitizeObject,
  stripHtml,
};
