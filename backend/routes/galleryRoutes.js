const express = require('express');
const router = express.Router();
const {
  getGallery,
  addMedia,
  deleteMedia,
  getHelplineAndRules
} = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getGallery)
  .post(protect, authorize('ADMIN'), addMedia);

router.route('/helpline')
  .get(getHelplineAndRules);

router.route('/:id')
  .delete(protect, authorize('ADMIN'), deleteMedia);

module.exports = router;
