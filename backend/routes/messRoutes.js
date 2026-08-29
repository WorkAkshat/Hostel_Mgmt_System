const express = require('express');
const {
  biometricVerifyMess,
  getMessStats,
  getMyMessAttendance,
  optOutMeal,
  cancelOptOut,
  getCookDashboard,
  getMessMenu,
  updateMessMenu
} = require('../controllers/messController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/biometric-verify', protect, biometricVerifyMess);
router.get('/stats', protect, authorize('ADMIN', 'STAFF'), getMessStats);
router.get('/my-attendance', protect, getMyMessAttendance);

// Meal Opt-Outs & Cook Dashboard
router.post('/opt-out', protect, optOutMeal);
router.delete('/opt-out/:id', protect, cancelOptOut);
router.get('/cook-dashboard', protect, getCookDashboard);

// Mess Menu endpoints
router.get('/menu', protect, getMessMenu);
router.post('/menu', protect, authorize('ADMIN'), updateMessMenu);

module.exports = router;
