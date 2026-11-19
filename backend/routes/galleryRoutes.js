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
  getHelplineAndRules,
  updateHostelInfo,
  addHelplineContact,
  updateHelplineContact,
  deleteHelplineContact,
  addHelplineRule,
  updateHelplineRule,
  deleteHelplineRule,
  addHelplineDocument,
  deleteHelplineDocument
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
  .get(getHelplineAndRules)
  .put(protect, authorize('ADMIN'), updateHostelInfo);

router.route('/helpline/contacts')
  .post(protect, authorize('ADMIN'), addHelplineContact);

router.route('/helpline/contacts/:id')
  .put(protect, authorize('ADMIN'), updateHelplineContact)
  .delete(protect, authorize('ADMIN'), deleteHelplineContact);

router.route('/helpline/rules')
  .post(protect, authorize('ADMIN'), addHelplineRule);

router.route('/helpline/rules/:id')
  .put(protect, authorize('ADMIN'), updateHelplineRule)
  .delete(protect, authorize('ADMIN'), deleteHelplineRule);

router.route('/helpline/documents')
  .post(protect, authorize('ADMIN'), addHelplineDocument);

router.route('/helpline/documents/:id')
  .delete(protect, authorize('ADMIN'), deleteHelplineDocument);

router.route('/:id')
  .put(protect, authorize('ADMIN'), updateMedia)
  .delete(protect, authorize('ADMIN'), deleteMedia);

module.exports = router;
