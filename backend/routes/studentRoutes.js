const express = require('express');
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  createProfileRequest,
  getPendingProfileRequests,
  approveProfileRequest,
  rejectProfileRequest,
  uploadDocument,
  verifyDocument,
  getStudentDocuments
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, authorize('ADMIN'), getAllStudents)
  .post(protect, authorize('ADMIN'), createStudent);

// Profile requests
router.route('/profile-requests')
  .get(protect, authorize('ADMIN'), getPendingProfileRequests)
  .post(protect, createProfileRequest);

router.route('/profile-requests/:id/approve')
  .post(protect, authorize('ADMIN'), approveProfileRequest);

router.route('/profile-requests/:id/reject')
  .post(protect, authorize('ADMIN'), rejectProfileRequest);

// ID Documents
router.route('/documents/upload')
  .post(protect, uploadDocument);

router.route('/documents/:id/verify')
  .post(protect, authorize('ADMIN'), verifyDocument);

router.route('/documents/:studentId')
  .get(protect, getStudentDocuments);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, authorize('ADMIN'), updateStudent)
  .delete(protect, authorize('ADMIN'), deleteStudent);

module.exports = router;
