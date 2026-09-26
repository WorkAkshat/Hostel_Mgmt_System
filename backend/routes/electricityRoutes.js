const express = require('express');
const router = express.Router();
const { submitReading, getReadings } = require('../controllers/electricityController');
const { protect, authorize } = require('../middleware/auth');

router.post('/readings', protect, authorize('ADMIN'), submitReading);
router.get('/readings', protect, authorize('ADMIN', 'STAFF'), getReadings);

module.exports = router;
