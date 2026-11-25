const express = require('express');
const {
  loginUser,
  getMe,
  registerUser,
  getPendingApprovals,
  approveUser,
  rejectUser,
  logoutUser,
  refreshToken,
  updatePushToken,
  testPushNotification,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  adminSetPassword,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);
router.post('/logout', protect, logoutUser);
router.post('/refresh', protect, refreshToken);
router.post('/push-token', protect, updatePushToken);
router.post('/test-push', testPushNotification);

// Admin approvals & password management
router.get('/pending', protect, authorize('ADMIN'), getPendingApprovals);
router.post('/approve/:id', protect, authorize('ADMIN'), approveUser);
router.post('/reject/:id', protect, authorize('ADMIN'), rejectUser);
router.post('/admin-set-password', protect, authorize('ADMIN'), adminSetPassword);

module.exports = router;
