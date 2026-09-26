const express = require('express');
const {
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  payInvoice,
  triggerAutoMonthlyInvoices
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, authorize('ADMIN'), createInvoice)
  .get(protect, authorize('ADMIN'), getAllInvoices);

router.route('/auto-generate-monthly')
  .post(protect, authorize('ADMIN'), triggerAutoMonthlyInvoices);

router.route('/my-invoices')
  .get(protect, getMyInvoices);

router.route('/:id/pay')
  .put(protect, authorize('ADMIN'), payInvoice);

module.exports = router;
