const express = require('express');
const router = express.Router();
const {
  getGallery,
  addMedia,
  deleteMedia,
  getHelplineAndRules
} = require('../controllers/galleryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.route('/')
  .get(getGallery)
  .post(protect, adminOnly, addMedia);

router.route('/helpline')
  .get(getHelplineAndRules);

router.route('/:id')
  .delete(protect, adminOnly, deleteMedia);

module.exports = router;
