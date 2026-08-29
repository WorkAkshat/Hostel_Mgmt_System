const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllFloors,
  getFloorStudents,
  getFloorReport,
  getConsolidatedReport,
} = require('../controllers/floorController');

// All floor routes require admin
router.use(protect, authorize('ADMIN'));

// GET /api/v1/floors                          – list all 5 floors with stats
router.get('/', getAllFloors);

// GET /api/v1/floors/consolidated/report      – all-floors financial report
router.get('/consolidated/report', getConsolidatedReport);

// GET /api/v1/floors/:floorNumber/students    – room-wise student directory
router.get('/:floorNumber/students', getFloorStudents);

// GET /api/v1/floors/:floorNumber/report      – floor financial report
router.get('/:floorNumber/report', getFloorReport);

module.exports = router;
