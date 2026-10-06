const express = require('express');
const {
  createInvoice,
  createCharge,
  deleteCharge,
  getAllInvoices,
  getMyInvoices,
  payInvoice,
  updateInvoice,
  triggerAutoMonthlyInvoices
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, authorize('ADMIN'), createInvoice)
  .get(protect, authorize('ADMIN'), getAllInvoices);

// Admin-only: ask a resident for money (fine, damage, deposit…) or record a payment
router.route('/charge')
  .post(protect, authorize('ADMIN'), createCharge);

router.route('/auto-generate-monthly')
  .post(protect, authorize('ADMIN'), triggerAutoMonthlyInvoices);

router.route('/my-invoices')
  .get(protect, getMyInvoices);

// Admin-only: edit amount / due date
router.route('/:id')
  .put(protect, authorize('ADMIN'), updateInvoice)
  .delete(protect, authorize('ADMIN'), deleteCharge);

// Both ADMIN and STUDENT can mark payment (student pays online)
router.route('/:id/pay')
  .put(protect, payInvoice);

module.exports = router;

