const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getActivityLogs, getActivityStats } = require('../controllers/activityLogController');

// All activity log routes are admin-only
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', getActivityLogs);
router.get('/stats', getActivityStats);

module.exports = router;
