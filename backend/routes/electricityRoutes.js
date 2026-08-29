const express = require('express');
const router = express.Router();
const { submitReading, getReadings } = require('../controllers/electricityController');
const { protect } = require('../middleware/auth');

router.post('/readings', protect, submitReading);
router.get('/readings', protect, getReadings);

module.exports = router;
