const express = require('express');
const { listAdvances, createAdvance, recoverAdvance, deleteAdvance } = require('../controllers/staffAdvanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Salary advances given to staff — warden / admin only
router.use(protect, authorize('ADMIN'));
router.route('/').get(listAdvances).post(createAdvance);
router.post('/:id/recover', recoverAdvance);
router.delete('/:id', deleteAdvance);

module.exports = router;
