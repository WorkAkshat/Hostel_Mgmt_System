const express = require('express');
const router = express.Router();
const {
  getGallery,
  getGalleryMeta,
  addMedia,
  updateMedia,
  deleteMedia,
  addCategory,
  deleteCategory,
  addType,
  deleteType,
  getHelplineAndRules
} = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getGallery)
  .post(protect, authorize('ADMIN'), addMedia);

router.route('/meta')
  .get(getGalleryMeta);

router.route('/categories')
  .post(protect, authorize('ADMIN'), addCategory);

router.route('/categories/:value')
  .delete(protect, authorize('ADMIN'), deleteCategory);

router.route('/types')
  .post(protect, authorize('ADMIN'), addType);

router.route('/types/:value')
  .delete(protect, authorize('ADMIN'), deleteType);

router.route('/helpline')
  .get(getHelplineAndRules);

router.route('/:id')
  .put(protect, authorize('ADMIN'), updateMedia)
  .delete(protect, authorize('ADMIN'), deleteMedia);

module.exports = router;
