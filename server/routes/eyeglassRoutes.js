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
router.get('/admin/low-stock', protect, admin, getAdminLowStock);
router.get('/:id', getEyeglass);
router.post('/create', protect, admin, createEyeglass);
router.put('/admin/:id/restock', protect, admin, restockEyeglass);
router.put('/:id', protect, admin, updateEyeglass);
router.delete('/:id', protect, admin, deleteEyeglass);

module.exports = router;
