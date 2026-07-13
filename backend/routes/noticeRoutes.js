const express = require('express');
const {
  createNotice,
  getAllNotices,
  deleteNotice
} = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, authorize('ADMIN'), createNotice)
  .get(protect, getAllNotices);

router.route('/:id')
  .delete(protect, authorize('ADMIN'), deleteNotice);

module.exports = router;
