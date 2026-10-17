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

// Warden records money received. Residents use "I have paid" (/payments/claims),
// which the warden confirms — a resident can never mark their own bill paid.
router.route('/:id/pay')
  .put(protect, authorize('ADMIN'), payInvoice);

module.exports = router;

