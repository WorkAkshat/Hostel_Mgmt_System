const express = require('express');
const {
  createLeaveRequest,
  getAllLeaveRequests,
  getMyLeaveRequests,
  updateLeaveRequestStatus,
  logCheckout,
  logCheckin,
  biometricVerifyGate
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/biometric-verify', biometricVerifyGate);

router.route('/')
  .post(protect, createLeaveRequest)
  .get(protect, authorize('ADMIN', 'STAFF'), getAllLeaveRequests);

router.route('/my-leaves')
  .get(protect, getMyLeaveRequests);

router.route('/:id/status')
  .put(protect, authorize('ADMIN'), updateLeaveRequestStatus);

router.route('/:id/checkout')
  .put(protect, authorize('ADMIN', 'STAFF'), logCheckout);

router.route('/:id/checkin')
  .put(protect, authorize('ADMIN', 'STAFF'), logCheckin);

module.exports = router;

