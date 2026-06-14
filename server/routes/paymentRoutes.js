const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/auth');
const { paymentLimiter } = require('../middlewares/security');
const {
  createCheckoutSession,
  getPendingCheckoutSession,
  confirmCheckoutSession,
  getAdminAnalytics,
  getAdminOrders,
  bulkUpdateAdminOrderStatus,
  updateAdminOrderStatus,
} = require('../controllers/paymentController');

router.post('/create-checkout-session', paymentLimiter, protect, createCheckoutSession);
router.get('/pending-session', paymentLimiter, protect, getPendingCheckoutSession);
router.get('/confirm/:sessionId', paymentLimiter, protect, confirmCheckoutSession);
router.post('/confirm/:sessionId', paymentLimiter, protect, confirmCheckoutSession);
router.get('/admin/analytics', protect, admin, getAdminAnalytics);
router.get('/admin/orders', protect, admin, getAdminOrders);
router.put('/admin/orders/bulk-status', protect, admin, bulkUpdateAdminOrderStatus);
router.put('/admin/orders/:orderId/status', protect, admin, updateAdminOrderStatus);

module.exports = router;
