const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

dotenv.config();

const { getJwtSecret, isOriginAllowed } = require('./securityConfig');
const {
  helmetMiddleware,
  globalApiLimiter,
  sanitizeInput,
  securityLogger,
  hppMiddleware,
  webhookLimiter,
} = require('../middlewares/security');
const { requireWebhookSecret } = require('../middlewares/webhookAuth');

getJwtSecret();

const eyeglassRoutes = require('../routes/eyeglassRoutes');
const userRoutes = require('../routes/userRoutes');
const categoryRoutes = require('../routes/categoryRoutes');
const cartRoutes = require('../routes/cartRoutes');
const paymentRoutes = require('../routes/paymentRoutes');
const screenshotPaymentRoutes = require('../routes/screenshotPaymentRoutes');
const aiRoutes = require('../routes/aiRoutes');
const { chapaWebhookHandler } = require('../controllers/paymentController');

const app = express();

app.disable('x-powered-by');
app.use(helmetMiddleware);
app.use(hppMiddleware);
app.use(securityLogger);

const webhookParser = express.json({ limit: '1mb' });
const webhookPipeline = [webhookLimiter, requireWebhookSecret, webhookParser, chapaWebhookHandler];

app.post('/api/payments/webhook', webhookPipeline);
app.post('/api/payments/webhook/chapa', webhookPipeline);
app.post('/api/v1/payments/webhook/chapa', webhookPipeline);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(sanitizeInput);

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret', 'X-Chapa-Signature'],
  })
);

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  dotfiles: 'deny',
  index: false,
}));

app.use('/api', globalApiLimiter);

app.use('/api/eyeglasses', eyeglassRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/screenshot-payments', screenshotPaymentRoutes);
app.use('/api/ai', aiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// ── Serve React frontend in production ──────────────────
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/eyeglass/dist');
  app.use(express.static(clientBuildPath));
  // All non-API routes return the React app (client-side routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Z Visionary (ዜድ መነጸር) API' });
  });
}

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload is too large.' });
  }

  if (err?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ message: 'Origin not allowed' });
  }

  console.error(err.stack || err.message);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
