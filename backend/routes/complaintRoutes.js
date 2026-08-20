const express = require('express');
const {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  updateComplaint,
  forwardDeveloperComplaint
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, createComplaint)
  .get(protect, authorize('ADMIN', 'STAFF'), getAllComplaints);

router.route('/my-complaints')
  .get(protect, getMyComplaints);

router.route('/:id')
  .put(protect, authorize('ADMIN'), updateComplaint);

router.route('/:id/forward-developer')
  .post(protect, authorize('ADMIN'), forwardDeveloperComplaint);

module.exports = router;
