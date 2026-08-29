const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to determine floor filter based on user role & query
const resolveFloorFilter = (req) => {
  if (req.user && req.user.role === 'ADMIN' && req.user.assignedFloor) {
    return req.user.assignedFloor;
  }
  if (req.query.floorNumber && req.query.floorNumber !== 'combined') {
    return parseInt(req.query.floorNumber, 10);
  }
  return null;
};

// @desc    Get Account Heads List
// @route   GET /api/v1/accounting/heads
// @access  Private (Admin/Warden)
const getAccountHeads = async (req, res) => {
  try {
    const heads = await prisma.accountHead.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(heads);
  } catch (error) {
    console.error('Error fetching account heads:', error);
    res.status(500).json({ message: 'Failed to fetch account heads' });
  }
};

// @desc    Get Day Book Vouchers
// @route   GET /api/v1/accounting/daybook
// @access  Private (Admin/Warden)
const getDayBook = async (req, res) => {
  try {
    const floorNum = resolveFloorFilter(req);
    const where = {};
    if (floorNum !== null) {
      where.floorNumber = floorNum;
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      include: {
        entries: {
          include: { accountHead: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(vouchers);
  } catch (error) {
    console.error('Error fetching Day Book:', error);
    res.status(500).json({ message: 'Failed to fetch Day Book vouchers' });
  }
};

// @desc    Get Trial Balance
// @route   GET /api/v1/accounting/trial-balance
// @access  Private (Admin/Warden)
const getTrialBalance = async (req, res) => {
  try {
    const floorNum = resolveFloorFilter(req);
    const where = {};
    if (floorNum !== null) {
      where.voucher = { floorNumber: floorNum };
    }

    const entries = await prisma.voucherEntry.findMany({
      where,
      include: {
        accountHead: true,
        voucher: true
      }
    });

    // Group by account head
    const ledgerSummary = {};
    entries.forEach(e => {
      const code = e.accountHead.code;
      if (!ledgerSummary[code]) {
        ledgerSummary[code] = {
          code: e.accountHead.code,
          name: e.accountHead.name,
          group: e.accountHead.group,
          category: e.accountHead.category,
          debit: 0,
          credit: 0,
          netBalance: 0
        };
      }
      if (e.type === 'DEBIT') {
        ledgerSummary[code].debit += e.amount;
      } else {
        ledgerSummary[code].credit += e.amount;
      }
      ledgerSummary[code].netBalance = ledgerSummary[code].debit - ledgerSummary[code].credit;
    });

    const trialBalanceList = Object.values(ledgerSummary);
    const totalDebit = trialBalanceList.reduce((acc, curr) => acc + curr.debit, 0);
    const totalCredit = trialBalanceList.reduce((acc, curr) => acc + curr.credit, 0);

    res.json({
      summary: trialBalanceList,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    });
  } catch (error) {
    console.error('Error calculating Trial Balance:', error);
    res.status(500).json({ message: 'Failed to calculate Trial Balance' });
  }
};

// @desc    Get Profit & Loss Statement
// @route   GET /api/v1/accounting/profit-loss
// @access  Private (Admin/Warden)
const getProfitLoss = async (req, res) => {
  try {
    const floorNum = resolveFloorFilter(req);
    const where = {};
    if (floorNum !== null) {
      where.voucher = { floorNumber: floorNum };
    }

    const entries = await prisma.voucherEntry.findMany({
      where,
      include: { accountHead: true, voucher: true }
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeHeads = {};
    const expenseHeads = {};

    entries.forEach(e => {
      const group = e.accountHead.group;
      const code = e.accountHead.code;

      if (group === 'INCOME') {
        const amt = e.type === 'CREDIT' ? e.amount : -e.amount;
        totalIncome += amt;
        incomeHeads[code] = (incomeHeads[code] || 0) + amt;
      } else if (group === 'EXPENSE') {
        const amt = e.type === 'DEBIT' ? e.amount : -e.amount;
        totalExpenses += amt;
        expenseHeads[code] = (expenseHeads[code] || 0) + amt;
      }
    });

    const netProfit = totalIncome - totalExpenses;

    res.json({
      totalIncome,
      totalExpenses,
      netProfit,
      incomeBreakdown: incomeHeads,
      expenseBreakdown: expenseHeads
    });
  } catch (error) {
    console.error('Error calculating Profit & Loss:', error);
    res.status(500).json({ message: 'Failed to generate Profit & Loss statement' });
  }
};

// @desc    Get Balance Sheet
// @route   GET /api/v1/accounting/balance-sheet
// @access  Private (Admin/Warden)
const getBalanceSheet = async (req, res) => {
  try {
    const floorNum = resolveFloorFilter(req);
    const where = {};
    if (floorNum !== null) {
      where.voucher = { floorNumber: floorNum };
    }

    const entries = await prisma.voucherEntry.findMany({
      where,
      include: { accountHead: true, voucher: true }
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    const assetBreakdown = {};
    const liabilityBreakdown = {};

    entries.forEach(e => {
      const group = e.accountHead.group;
      const code = e.accountHead.code;

      if (group === 'ASSET') {
        const amt = e.type === 'DEBIT' ? e.amount : -e.amount;
        totalAssets += amt;
        assetBreakdown[code] = (assetBreakdown[code] || 0) + amt;
      } else if (group === 'LIABILITY') {
        const amt = e.type === 'CREDIT' ? e.amount : -e.amount;
        totalLiabilities += amt;
        liabilityBreakdown[code] = (liabilityBreakdown[code] || 0) + amt;
      }
    });

    res.json({
      totalAssets,
      totalLiabilities,
      assetBreakdown,
      liabilityBreakdown,
      capitalAndReserves: totalAssets - totalLiabilities
    });
  } catch (error) {
    console.error('Error generating Balance Sheet:', error);
    res.status(500).json({ message: 'Failed to generate Balance Sheet' });
  }
};

// @desc    Create Voucher Entry (Receipt / Payment / Journal)
// @route   POST /api/v1/accounting/vouchers
// @access  Private (Admin/Warden)
const createVoucher = async (req, res) => {
  const { voucherType, date, floorNumber, companyName, narration, amount, debitHeadCode, creditHeadCode } = req.body;

  if (!voucherType || !narration || !amount || !debitHeadCode || !creditHeadCode) {
    return res.status(400).json({ message: 'Voucher type, narration, amount, debit head, and credit head are required' });
  }

  try {
    const drHead = await prisma.accountHead.findUnique({ where: { code: debitHeadCode } });
    const crHead = await prisma.accountHead.findUnique({ where: { code: creditHeadCode } });

    if (!drHead || !crHead) {
      return res.status(400).json({ message: 'Invalid debit or credit account head code' });
    }

    const assignedFloor = req.user.assignedFloor || (floorNumber ? parseInt(floorNumber, 10) : null);
    const voucherNo = `VCH-${Date.now().toString().slice(-6)}`;

    const newVoucher = await prisma.voucher.create({
      data: {
        voucherNo,
        voucherType,
        date: date ? new Date(date) : new Date(),
        floorNumber: assignedFloor,
        companyName: companyName || (assignedFloor ? `Floor ${assignedFloor} Firm` : 'Consolidated'),
        narration,
        amount: parseFloat(amount),
        createdBy: req.user.email
      }
    });

    await prisma.voucherEntry.createMany({
      data: [
        { voucherId: newVoucher.id, accountHeadId: drHead.id, type: 'DEBIT', amount: parseFloat(amount) },
        { voucherId: newVoucher.id, accountHeadId: crHead.id, type: 'CREDIT', amount: parseFloat(amount) }
      ]
    });

    res.status(201).json(newVoucher);
  } catch (error) {
    console.error('Error creating voucher:', error);
    res.status(500).json({ message: 'Failed to create voucher' });
  }
};

module.exports = {
  getAccountHeads,
  getDayBook,
  getTrialBalance,
  getProfitLoss,
  getBalanceSheet,
  createVoucher
};
