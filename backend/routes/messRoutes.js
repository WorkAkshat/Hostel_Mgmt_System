const express = require('express');
const {
  biometricVerifyMess,
  getMessStats,
  getMyMessAttendance
} = require('../controllers/messController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/biometric-verify', biometricVerifyMess);
router.get('/stats', protect, authorize('ADMIN'), getMessStats);
router.get('/my-attendance', protect, getMyMessAttendance);

module.exports = router;
