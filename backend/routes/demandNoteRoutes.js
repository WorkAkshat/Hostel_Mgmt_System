const express = require('express');
const router = express.Router();
const { generateDemandNotes, getDemandNotes, getCompanyConfig, markPaid, payOnline } = require('../controllers/demandNoteController');
const { protect, authorize } = require('../middleware/auth');

router.post('/generate', protect, authorize('ADMIN'), generateDemandNotes);
router.get('/', protect, getDemandNotes);
router.get('/company-config', protect, getCompanyConfig);
router.patch('/:id/mark-paid', protect, authorize('ADMIN'), markPaid);
router.post('/:id/pay', protect, payOnline);

module.exports = router;
