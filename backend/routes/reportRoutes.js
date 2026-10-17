const express = require('express');
const { getSummary } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', protect, authorize('ADMIN'), getSummary);

module.exports = router;
