const express = require('express');
const {
  getAllStaff,
  createStaff,
  deleteStaff
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getAllStaff)
  .post(protect, authorize('ADMIN'), createStaff);

router.route('/:id')
  .delete(protect, authorize('ADMIN'), deleteStaff);

module.exports = router;
