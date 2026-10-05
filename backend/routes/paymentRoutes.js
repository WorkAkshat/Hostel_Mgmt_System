const express = require('express');
const { getSettings, updateSettings, createClaim, myClaims, listClaims, approveClaim, rejectClaim } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Hostel UPI / bank details shown to residents on their bills
router.get('/settings', protect, getSettings);
router.put('/settings', protect, authorize('ADMIN'), updateSettings);

// "I have paid" from a resident → warden confirms or rejects
router.post('/claims', protect, authorize('STUDENT'), createClaim);
router.get('/claims/mine', protect, authorize('STUDENT'), myClaims);
router.get('/claims', protect, authorize('ADMIN'), listClaims);
router.post('/claims/:id/approve', protect, authorize('ADMIN'), approveClaim);
router.post('/claims/:id/reject', protect, authorize('ADMIN'), rejectClaim);

module.exports = router;
