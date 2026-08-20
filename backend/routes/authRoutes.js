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
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/me', protect, getMe);
router.post('/logout', protect, logoutUser);
router.post('/refresh', protect, refreshToken);
router.post('/push-token', protect, updatePushToken);
router.post('/test-push', testPushNotification);

// Admin approvals
router.get('/pending', protect, authorize('ADMIN'), getPendingApprovals);
router.post('/approve/:id', protect, authorize('ADMIN'), approveUser);
router.post('/reject/:id', protect, authorize('ADMIN'), rejectUser);

module.exports = router;
