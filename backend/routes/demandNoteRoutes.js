const express = require('express');
const router = express.Router();
const { generateDemandNotes, getDemandNotes, getCompanyConfig, markPaid } = require('../controllers/demandNoteController');
const { protect, authorize } = require('../middleware/auth');

router.post('/generate', protect, authorize('ADMIN'), generateDemandNotes);
router.get('/', protect, getDemandNotes);
router.get('/company-config', protect, getCompanyConfig);
router.patch('/:id/mark-paid', protect, authorize('ADMIN'), markPaid);
// Kept for older app builds; payments are recorded by the warden only
router.post('/:id/pay', protect, authorize('ADMIN'), markPaid);

module.exports = router;
