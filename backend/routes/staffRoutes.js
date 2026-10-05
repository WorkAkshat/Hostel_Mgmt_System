const express = require('express');
const {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getAllStaff)
  .post(protect, authorize('ADMIN'), createStaff);

router.route('/:id')
  .put(protect, authorize('ADMIN'), updateStaff)
  .delete(protect, authorize('ADMIN'), deleteStaff);

module.exports = router;
