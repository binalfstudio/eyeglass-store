const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const { sanitizeObject } = require('../utils/securityConfig');

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'http://localhost:5000', 'http://127.0.0.1:5000'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait and try again.' },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment requests. Please try again later.' },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Webhook rate limit exceeded.' },
});

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
};

const securityLogger = (req, res, next) => {
  const safeUrl = req.originalUrl.split('?')[0];
  console.log(`[${new Date().toISOString()}] ${req.method} ${safeUrl}`);
  next();
};

module.exports = {
  helmetMiddleware,
  globalApiLimiter,
  authLimiter,
  paymentLimiter,
  webhookLimiter,
  sanitizeInput,
  securityLogger,
  hppMiddleware: hpp(),
};
