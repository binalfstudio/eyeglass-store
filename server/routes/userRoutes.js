const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAdminUsers,
  getAdminNotifications,
  markAdminNotificationRead,
} = require('../controllers/userController');
const { protect, admin } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/security');
const { registerRules, loginRules, profileUpdateRules } = require('../middlewares/validate');

router.post('/register', authLimiter, registerRules, registerUser);
router.post('/login', authLimiter, loginRules, loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, profileUpdateRules, updateUserProfile);
router.get('/admin/users', protect, admin, getAdminUsers);
router.get('/admin/notifications', protect, admin, getAdminNotifications);
router.put('/admin/notifications/:id/read', protect, admin, markAdminNotificationRead);

module.exports = router;
