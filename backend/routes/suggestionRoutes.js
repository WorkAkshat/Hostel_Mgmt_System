const express = require('express');
const router = express.Router();
const { createSuggestion, getMySuggestions, getSuggestions, updateStatus } = require('../controllers/suggestionController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, createSuggestion);
router.get('/mine', protect, getMySuggestions);
router.get('/', protect, authorize('ADMIN', 'STAFF'), getSuggestions);
router.patch('/:id/status', protect, authorize('ADMIN'), updateStatus);

module.exports = router;
