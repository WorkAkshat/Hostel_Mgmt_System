const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

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

// @desc    Get Day Book (Voucher Register)
// @route   GET /api/v1/accounting/daybook
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
      orderBy: { date: 'desc' }
    });

    // Transform to proper Day Book format with separate Dr/Cr entries
    const dayBookRows = [];
    vouchers.forEach(v => {
      const drEntries = v.entries.filter(e => e.type === 'DEBIT');
      const crEntries = v.entries.filter(e => e.type === 'CREDIT');

      drEntries.forEach(dr => {
        const cr = crEntries[0]; // Paired credit entry
        dayBookRows.push({
          id: v.id,
          voucherNo: v.voucherNo,
          date: v.date,
          voucherType: v.voucherType,
          companyName: v.companyName,
          narration: v.narration,
          debitHead: dr.accountHead.name,
          debitAmount: dr.amount,
          creditHead: cr ? cr.accountHead.name : '',
          creditAmount: cr ? cr.amount : 0
        });
      });
    });

    res.json(dayBookRows);
  } catch (error) {
    console.error('Error fetching Day Book:', error);
    res.status(500).json({ message: 'Failed to fetch Day Book vouchers' });
  }
};

// @desc    Get Trial Balance
// @route   GET /api/v1/accounting/trial-balance
const getTrialBalance = async (req, res) => {
  try {
    const floorNum = resolveFloorFilter(req);
    const where = {};
    if (floorNum !== null) {
      where.voucher = { floorNumber: floorNum };
    }

    const entries = await prisma.voucherEntry.findMany({
      where,
      include: { accountHead: true }
    });

    // Group by account head
    const ledgerMap = {};
    entries.forEach(e => {
      const code = e.accountHead.code;
      if (!ledgerMap[code]) {
        ledgerMap[code] = {
          code,
          name: e.accountHead.name,
          group: e.accountHead.group,
          category: e.accountHead.category,
          debit: 0,
          credit: 0,
        };
      }
      if (e.type === 'DEBIT') {
        ledgerMap[code].debit += e.amount;
      } else {
        ledgerMap[code].credit += e.amount;
      }
    });

    // Per ICAI: Trial Balance shows closing balance per head
    // Assets & Expenses have debit balances, Liabilities & Income have credit balances
    const summary = Object.values(ledgerMap).map(h => {
      const net = h.debit - h.credit;
      return {
        ...h,
        closingDebit: net > 0 ? net : 0,
        closingCredit: net < 0 ? Math.abs(net) : 0,
      };
    });

    const totalDebit = summary.reduce((a, c) => a + c.closingDebit, 0);
    const totalCredit = summary.reduce((a, c) => a + c.closingCredit, 0);

    res.json({
      summary,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    });
  } catch (error) {
    console.error('Error calculating Trial Balance:', error);
    res.status(500).json({ message: 'Failed to calculate Trial Balance' });
  }
};

// @desc    ICAI Profit & Loss Account (Income & Expenditure Statement)
// @route   GET /api/v1/accounting/profit-loss
const getProfitLoss = async (req, res) => {
  try {
    const floorNum = resolveFloorFilter(req);
    const where = {};
    if (floorNum !== null) {
      where.voucher = { floorNumber: floorNum };
    }

    const entries = await prisma.voucherEntry.findMany({
      where,
      include: { accountHead: true }
    });

    const incomeHeads = {};
    const expenseHeads = {};

    entries.forEach(e => {
      const { group, name } = e.accountHead;
      if (group === 'INCOME') {
        // Income is a credit-nature account. Credit increases, Debit decreases.
        const amt = e.type === 'CREDIT' ? e.amount : -e.amount;
        incomeHeads[name] = (incomeHeads[name] || 0) + amt;
      } else if (group === 'EXPENSE') {
        // Expense is a debit-nature account. Debit increases, Credit decreases.
        const amt = e.type === 'DEBIT' ? e.amount : -e.amount;
        expenseHeads[name] = (expenseHeads[name] || 0) + amt;
      }
    });

    const totalIncome = Object.values(incomeHeads).reduce((a, c) => a + c, 0);
    const totalExpenses = Object.values(expenseHeads).reduce((a, c) => a + c, 0);
    const netProfit = totalIncome - totalExpenses;

    res.json({
      incomeBreakdown: Object.entries(incomeHeads).map(([name, amount]) => ({ name, amount })),
      expenseBreakdown: Object.entries(expenseHeads).map(([name, amount]) => ({ name, amount })),
      totalIncome,
      totalExpenses,
      netProfit
    });
  } catch (error) {
    console.error('Error calculating Profit & Loss:', error);
    res.status(500).json({ message: 'Failed to generate Profit & Loss statement' });
  }
};

// @desc    ICAI Schedule III Balance Sheet
// @route   GET /api/v1/accounting/balance-sheet
const getBalanceSheet = async (req, res) => {
  try {
    const floorNum = resolveFloorFilter(req);
    const where = {};
    if (floorNum !== null) {
      where.voucher = { floorNumber: floorNum };
    }

    const entries = await prisma.voucherEntry.findMany({
      where,
      include: { accountHead: true }
    });

    const assetHeads = {};
    const liabilityHeads = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    entries.forEach(e => {
      const { group, name } = e.accountHead;
      if (group === 'ASSET') {
        const amt = e.type === 'DEBIT' ? e.amount : -e.amount;
        assetHeads[name] = (assetHeads[name] || 0) + amt;
      } else if (group === 'LIABILITY') {
        const amt = e.type === 'CREDIT' ? e.amount : -e.amount;
        liabilityHeads[name] = (liabilityHeads[name] || 0) + amt;
      } else if (group === 'INCOME') {
        totalIncome += e.type === 'CREDIT' ? e.amount : -e.amount;
      } else if (group === 'EXPENSE') {
        totalExpenses += e.type === 'DEBIT' ? e.amount : -e.amount;
      }
    });

    const netProfit = totalIncome - totalExpenses;
    const totalAssets = Object.values(assetHeads).reduce((a, c) => a + c, 0);
    const totalLiabilities = Object.values(liabilityHeads).reduce((a, c) => a + c, 0);

    // Balance Sheet equation: Assets = Liabilities + Capital (Net Profit is part of Capital)
    res.json({
      assetBreakdown: Object.entries(assetHeads).map(([name, amount]) => ({ name, amount })),
      liabilityBreakdown: Object.entries(liabilityHeads).map(([name, amount]) => ({ name, amount })),
      totalAssets,
      totalLiabilities,
      netProfit,
      capitalAndReserves: netProfit,
      totalEquityAndLiabilities: totalLiabilities + netProfit
    });
  } catch (error) {
    console.error('Error generating Balance Sheet:', error);
    res.status(500).json({ message: 'Failed to generate Balance Sheet' });
  }
};

// @desc    Student-Wise General Ledger
// @route   GET /api/v1/accounting/student-ledger/:studentId
const getStudentLedger = async (req, res) => {
  const { studentId } = req.params;
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true, room: true, demandNotes: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const entries = [];

    // Demand notes as Debit (Dr) entries — charge to student
    student.demandNotes.forEach(dn => {
      entries.push({
        date: dn.createdAt,
        voucherNo: `DN-${dn.billingMonth}`,
        particulars: `Demand Note – ${dn.billingMonth} (Hostel ₹${dn.hostelFee || 0} + Elec ₹${dn.electricityAmount || 0} + Mess ₹${dn.messFee || 0})`,
        debit: dn.totalAmount,
        credit: 0,
        type: 'DEMAND_NOTE'
      });

      if (dn.status === 'PAID' && dn.paidAt) {
        entries.push({
          date: dn.paidAt,
          voucherNo: `REC-${dn.billingMonth}`,
          particulars: `Payment Received – ${dn.billingMonth}`,
          debit: 0,
          credit: dn.totalAmount,
          type: 'RECEIPT'
        });
      }
    });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledger = entries.map(e => {
      runningBalance += (e.debit - e.credit);
      return { ...e, runningBalance };
    });

    // Compute date range from entries
    let periodFrom = null;
    let periodTo = null;
    if (entries.length > 0) {
      periodFrom = new Date(entries[0].date);
      periodTo = new Date(entries[entries.length - 1].date);
    }

    const totalDebit = entries.reduce((a, c) => a + c.debit, 0);
    const totalCredit = entries.reduce((a, c) => a + c.credit, 0);

    res.json({
      student: {
        id: student.id,
        name: student.user.name,
        email: student.user.email,
        rollNumber: student.rollNumber,
        roomNumber: student.room?.roomNumber || 'N/A',
        bedId: student.bedId || 'N/A'
      },
      ledger,
      totalDebit,
      totalCredit,
      closingBalance: runningBalance,
      periodFrom,
      periodTo
    });
  } catch (error) {
    console.error('Error fetching student ledger:', error);
    res.status(500).json({ message: 'Failed to fetch student ledger' });
  }
};

// @desc    Create Voucher Entry (Receipt / Payment / Journal / Contra)
// @route   POST /api/v1/accounting/vouchers
const createVoucher = async (req, res) => {
  const { voucherType, date, floorNumber, companyName, narration, amount, debitHeadCode, creditHeadCode } = req.body;

  if (!voucherType || !narration || !amount || !debitHeadCode || !creditHeadCode) {
    return res.status(400).json({ message: 'Voucher type, narration, amount, debit head, and credit head are required' });
  }

  if (debitHeadCode === creditHeadCode) {
    return res.status(400).json({ message: 'Debit and Credit account heads must be different' });
  }

  try {
    const drHead = await prisma.accountHead.findUnique({ where: { code: debitHeadCode } });
    const crHead = await prisma.accountHead.findUnique({ where: { code: creditHeadCode } });

    if (!drHead || !crHead) {
      return res.status(400).json({ message: 'Invalid debit or credit account head code' });
    }

    const assignedFloor = req.user.assignedFloor || (floorNumber ? parseInt(floorNumber, 10) : null);

    // Generate proper voucher number: VCH-REC-2026-XXXXX
    const prefix = voucherType === 'RECEIPT' ? 'REC' : voucherType === 'PAYMENT' ? 'PAY' : voucherType === 'CONTRA' ? 'CNT' : 'JRN';
    const count = await prisma.voucher.count();
    const voucherNo = `VCH-${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const firmNames = { 1: 'Rajken Enterprises', 2: 'Vandana Enterprises', 3: 'Pushpa Enterprises', 4: 'Harish Chandra Enterprises', 5: 'Ramesh Enterprises' };

    const newVoucher = await prisma.voucher.create({
      data: {
        voucherNo,
        voucherType,
        date: date ? new Date(date) : new Date(),
        floorNumber: assignedFloor,
        companyName: companyName || (assignedFloor ? firmNames[assignedFloor] : 'Consolidated'),
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

    logActivity({ req, action: 'CREATE', module: 'ACCOUNTING', description: `Posted ${voucherType} voucher ${newVoucher.voucherNo} — ₹${amount} — ${narration}`, targetId: newVoucher.id, targetType: 'Voucher' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create voucher' });
  }
};

module.exports = {
  getAccountHeads,
  getDayBook,
  getTrialBalance,
  getProfitLoss,
  getBalanceSheet,
  getStudentLedger,
  createVoucher
};
