const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAccountHeads,
  getDayBook,
  getTrialBalance,
  getProfitLoss,
  getBalanceSheet,
  getStudentLedger,
  createVoucher
} = require('../controllers/accountingController');

// All accounting routes protected for ADMIN / STAFF (Warden)
router.use(protect);
router.use(authorize('ADMIN', 'STAFF'));

router.get('/heads', getAccountHeads);
router.get('/daybook', getDayBook);
router.get('/trial-balance', getTrialBalance);
router.get('/profit-loss', getProfitLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/student-ledger/:studentId', getStudentLedger);
router.post('/vouchers', createVoucher);

module.exports = router;
