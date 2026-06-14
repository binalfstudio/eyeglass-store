const { verifyWebhookSecret } = require('../utils/securityConfig');

const requireWebhookSecret = (req, res, next) => {
  if (!verifyWebhookSecret(req)) {
    console.warn('[SECURITY] Rejected webhook: invalid or missing secret');
    return res.status(401).json({ message: 'Unauthorized webhook' });
  }
  next();
};

module.exports = { requireWebhookSecret };
