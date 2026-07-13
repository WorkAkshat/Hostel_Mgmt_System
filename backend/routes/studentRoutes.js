const express = require('express');
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, authorize('ADMIN'), getAllStudents)
  .post(protect, authorize('ADMIN'), createStudent);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, authorize('ADMIN'), updateStudent)
  .delete(protect, authorize('ADMIN'), deleteStudent);

module.exports = router;
