const express = require('express');
const router = express.Router();
const { getAiConfigStatus, generateTryOnImage } = require('../controllers/aiController');
const { paymentLimiter } = require('../middlewares/security');

router.get('/status', getAiConfigStatus);
router.post('/tryon/generate', paymentLimiter, generateTryOnImage);

module.exports = router;