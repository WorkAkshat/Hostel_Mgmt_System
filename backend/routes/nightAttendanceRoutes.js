const express = require('express');
const router = express.Router();
const { submitNightAttendance, getNightAttendance } = require('../controllers/nightAttendanceController');
const { protect, authorize } = require('../middleware/auth');

router.post('/bulk', protect, authorize('ADMIN', 'STAFF'), submitNightAttendance);
router.get('/', protect, authorize('ADMIN', 'STAFF'), getNightAttendance);

module.exports = router;
