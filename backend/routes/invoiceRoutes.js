const express = require('express');
const {
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  payInvoice
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, authorize('ADMIN'), createInvoice)
  .get(protect, authorize('ADMIN'), getAllInvoices);

router.route('/my-invoices')
  .get(protect, getMyInvoices);

router.route('/:id/pay')
  .put(protect, payInvoice);

module.exports = router;
