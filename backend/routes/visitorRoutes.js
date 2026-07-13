const express = require('express');
const {
  createVisitor,
  getAllVisitors,
  logVisitorCheckout
} = require('../controllers/visitorController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, authorize('ADMIN', 'STAFF'), createVisitor)
  .get(protect, getAllVisitors);

router.route('/:id/checkout')
  .put(protect, authorize('ADMIN', 'STAFF'), logVisitorCheckout);

module.exports = router;
