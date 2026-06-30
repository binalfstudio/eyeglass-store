const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const { paymentLimiter } = require('../middlewares/security');
const {
  uploadScreenshotMiddleware,
  submitScreenshotPayment,
  adminListScreenshotPayments,
  adminReviewScreenshotPayment,
  getUserScreenshotPayments,
} = require('../controllers/screenshotPaymentController');

// User: submit a payment screenshot
router.post(
  '/submit',
  paymentLimiter,
  protect,
  (req, res, next) => {
    uploadScreenshotMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload failed' });
      }
      next();
    });
  },
  submitScreenshotPayment
);

// User: view their own submissions
router.get('/my-submissions', protect, getUserScreenshotPayments);

// Admin: list all screenshot payments
router.get('/admin/list', protect, admin, adminListScreenshotPayments);

// Admin: approve or reject a screenshot payment
router.put('/admin/:id/review', protect, admin, adminReviewScreenshotPayment);

module.exports = router;
