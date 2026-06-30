const express = require('express');
const router = express.Router();
const {
  getEyeglasses,
  getEyeglass,
  createEyeglass,
  getAdminLowStock,
  restockEyeglass,
  updateEyeglass,
  deleteEyeglass,
} = require('../controllers/eyeglassController');
const { protect, admin } = require('../middlewares/auth');

router.get('/', getEyeglasses);
// Specific admin routes MUST come before /:id to avoid Express matching 'admin' as an id
router.get('/admin/low-stock', protect, admin, getAdminLowStock);
router.post('/create', protect, admin, createEyeglass);
router.put('/admin/:id/restock', protect, admin, restockEyeglass);
// Generic /:id routes go after specific routes
router.get('/:id', getEyeglass);
router.put('/:id', protect, admin, updateEyeglass);
router.delete('/:id', protect, admin, deleteEyeglass);

module.exports = router;
