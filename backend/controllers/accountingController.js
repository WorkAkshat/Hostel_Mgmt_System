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

const STANDARD_ACCOUNT_HEADS = [
  { code: 'REV-HOSTEL',        name: 'Hostel Accommodation Income',        group: 'INCOME',    category: 'DIRECT' },
  { code: 'REV-MESS',          name: 'Mess & Catering Income',             group: 'INCOME',    category: 'DIRECT' },
  { code: 'REV-ELEC',          name: 'Electricity Charges Reimbursement',  group: 'INCOME',    category: 'DIRECT' },
  { code: 'REV-OTHER',         name: 'Other Charges from Residents',       group: 'INCOME',    category: 'INDIRECT' },
  { code: 'EXP-ELEC-UTIL',     name: 'Electricity Utility Bill (State)',   group: 'EXPENSE',   category: 'DIRECT' },
  { code: 'EXP-MESS-PAYMENT',  name: 'Meenakshi Catering Payment',         group: 'EXPENSE',   category: 'DIRECT' },
  { code: 'EXP-MAINT',         name: 'Hostel Repairs & Maintenance',       group: 'EXPENSE',   category: 'INDIRECT' },
  { code: 'EXP-STAFF-SALARY',  name: 'Staff & Security Salaries',          group: 'EXPENSE',   category: 'INDIRECT' },
  { code: 'ASSET-BANK',        name: 'HDFC Bank Account (Current)',        group: 'ASSET',     category: 'CURRENT' },
  { code: 'ASSET-CASH',        name: 'Cash in Hand',                       group: 'ASSET',     category: 'CURRENT' },
  { code: 'LIAB-SECURITY',     name: 'Student Refundable Security Deposit',group: 'LIABILITY', category: 'CURRENT' },
  { code: 'LIAB-VENDOR-PAYABLE', name: 'Sundry Creditors / Vendor Payables', group: 'LIABILITY', category: 'CURRENT' },
  // Daily Expense Heads
  { code: 'EXP-CLEANING',       name: 'Cleaning Supplies & Housekeeping',   group: 'EXPENSE',   category: 'DIRECT' },
  { code: 'EXP-PETTY-CASH',     name: 'Petty Cash / Miscellaneous',         group: 'EXPENSE',   category: 'INDIRECT' },
  { code: 'EXP-WATER',          name: 'Water Supply & Tanker Charges',      group: 'EXPENSE',   category: 'DIRECT' },
  { code: 'EXP-TRANSPORT',      name: 'Transport & Travel Expenses',        group: 'EXPENSE',   category: 'INDIRECT' },
  { code: 'EXP-STATIONERY',     name: 'Stationery & Office Supplies',       group: 'EXPENSE',   category: 'INDIRECT' },
  { code: 'EXP-INTERNET',       name: 'Internet / WiFi & Telecom',          group: 'EXPENSE',   category: 'INDIRECT' },
  { code: 'EXP-PEST-CONTROL',   name: 'Pest Control & Fumigation',          group: 'EXPENSE',   category: 'DIRECT' },
  { code: 'EXP-KITCHEN',        name: 'Kitchen & Pantry Supplies',          group: 'EXPENSE',   category: 'DIRECT' },
  { code: 'EXP-OTHERS',         name: 'Other / General Expenses',           group: 'EXPENSE',   category: 'INDIRECT' },
];

let headsEnsured = false;
const ensureAccountHeads = async () => {
  if (headsEnsured) return;
  try {
    const existing = await prisma.accountHead.findMany({ select: { code: true } });
    const existingCodes = new Set(existing.map(e => e.code));
    for (const head of STANDARD_ACCOUNT_HEADS) {
      if (!existingCodes.has(head.code)) {
        await prisma.accountHead.create({ data: head });
      }
    }
    headsEnsured = true;
  } catch (err) {
    console.error('[Accounting] Failed to ensure account heads:', err.message);
  }
};

// Auto-sync all paid invoices and demand notes into the Tally Ledger / Vouchers
const syncAccountingReceipts = async () => {
  await ensureAccountHeads();

  const firmNames = {
    1: 'Rajken Enterprises',
    2: 'Vandana Enterprises',
    3: 'Pushpa Enterprises',
    4: 'Harish Chandra Enterprises',
    5: 'Ramesh Enterprises'
  };

  const drBankHead = await prisma.accountHead.findUnique({ where: { code: 'ASSET-BANK' } });
  const crRentHead = await prisma.accountHead.findUnique({ where: { code: 'REV-HOSTEL' } });
  const crMessHead = await prisma.accountHead.findUnique({ where: { code: 'REV-MESS' } });
  const crElecHead = await prisma.accountHead.findUnique({ where: { code: 'REV-ELEC' } });

  if (!drBankHead || !crRentHead || !crMessHead || !crElecHead) return { synced: 0 };

  // 1. Sync Paid Invoices
  const paidInvoices = await prisma.invoice.findMany({
    where: { status: 'PAID' },
    include: {
      student: {
        include: { user: true, room: true }
      }
    }
  });

  let syncedInvoices = 0;
  for (const inv of paidInvoices) {
    const voucherNo = `VCH-INV-${inv.id.substring(0, 8).toUpperCase()}`;
    const existing = await prisma.voucher.findUnique({ where: { voucherNo } });
    if (!existing) {
      const floor = inv.student?.room?.floorNumber || inv.floorNumber || 1;
      const company = inv.companyName || firmNames[floor] || 'Hari Pushp Tower';
      const studentName = inv.student?.user?.name || 'Student';
      const rollNo = inv.student?.rollNumber || '';
      const roomNo = inv.student?.room?.roomNumber || '';

      const totalAmt = parseFloat(inv.amount) || 0;

      // Fine / damage / deposit etc.: one credit line, no rent / mess split
      if (inv.kind === 'CHARGE') {
        const head = await prisma.accountHead.findUnique({ where: { code: inv.category === 'DEPOSIT' ? 'LIAB-SECURITY' : 'REV-OTHER' } });
        if (!head) continue;
        const voucher = await prisma.voucher.create({
          data: {
            voucherNo,
            voucherType: 'RECEIPT',
            date: inv.paidAt || inv.createdAt || new Date(),
            floorNumber: floor,
            companyName: company,
            narration: `${inv.title || 'Charge'} – ${studentName} (${rollNo}) – Room ${roomNo}`,
            amount: totalAmt,
            createdBy: 'system@hms.local'
          }
        });
        await prisma.voucherEntry.create({ data: { voucherId: voucher.id, accountHeadId: drBankHead.id, type: 'DEBIT', amount: totalAmt } });
        await prisma.voucherEntry.create({ data: { voucherId: voucher.id, accountHeadId: head.id, type: 'CREDIT', amount: totalAmt } });
        syncedInvoices++;
        continue;
      }

      let rentAmt = inv.rentAmount !== null && inv.rentAmount !== undefined ? parseFloat(inv.rentAmount) : null;
      let messAmt = inv.messAmount !== null && inv.messAmount !== undefined ? parseFloat(inv.messAmount) : null;
      let elecAmt = inv.electricityAmount !== null && inv.electricityAmount !== undefined ? parseFloat(inv.electricityAmount) : null;

      if (rentAmt === null && messAmt === null && elecAmt === null) {
        rentAmt = Math.max(0, totalAmt - 3000);
        messAmt = Math.min(3000, totalAmt);
        elecAmt = 0;
      } else {
        rentAmt = rentAmt || 0;
        messAmt = messAmt || 0;
        elecAmt = elecAmt || 0;
      }

      const vDate = inv.paidAt || inv.createdAt || new Date();

      const voucher = await prisma.voucher.create({
        data: {
          voucherNo,
          voucherType: 'RECEIPT',
          date: vDate,
          floorNumber: floor,
          companyName: company,
          narration: `Rent & Fee Receipt – ${studentName} (${rollNo}) – Room ${roomNo}`,
          amount: totalAmt,
          createdBy: 'system@hms.local'
        }
      });

      // Debit Bank (Total)
      await prisma.voucherEntry.create({
        data: {
          voucherId: voucher.id,
          accountHeadId: drBankHead.id,
          type: 'DEBIT',
          amount: totalAmt
        }
      });

      // Credit Revenue Heads
      if (rentAmt > 0) {
        await prisma.voucherEntry.create({
          data: { voucherId: voucher.id, accountHeadId: crRentHead.id, type: 'CREDIT', amount: rentAmt }
        });
      }
      if (messAmt > 0) {
        await prisma.voucherEntry.create({
          data: { voucherId: voucher.id, accountHeadId: crMessHead.id, type: 'CREDIT', amount: messAmt }
        });
      }
      if (elecAmt > 0) {
        await prisma.voucherEntry.create({
          data: { voucherId: voucher.id, accountHeadId: crElecHead.id, type: 'CREDIT', amount: elecAmt }
        });
      }

      syncedInvoices++;
    }
  }

  // 2. Sync Paid Demand Notes
  const paidDemandNotes = await prisma.demandNote.findMany({
    where: { status: 'PAID' },
    include: {
      student: {
        include: { user: true, room: true }
      }
    }
  });

  let syncedDemandNotes = 0;
  for (const dn of paidDemandNotes) {
    const voucherNo = `VCH-DN-${dn.id.substring(0, 8).toUpperCase()}`;
    const existing = await prisma.voucher.findUnique({ where: { voucherNo } });
    if (!existing) {
      const floor = dn.student?.room?.floorNumber || dn.floorNumber || 1;
      const company = dn.companyName || firmNames[floor] || 'Hari Pushp Tower';
      const studentName = dn.student?.user?.name || 'Student';
      const rollNo = dn.student?.rollNumber || '';
      const roomNo = dn.student?.room?.roomNumber || '';

      const totalAmt = parseFloat(dn.totalAmount) || 0;
      const rentAmt = parseFloat(dn.hostelFee) || 0;
      const messAmt = parseFloat(dn.messFee) || 0;
      const elecAmt = parseFloat(dn.electricityAmount) || 0;
      const vDate = dn.paidAt || dn.createdAt || new Date();

      const voucher = await prisma.voucher.create({
        data: {
          voucherNo,
          voucherType: 'RECEIPT',
          date: vDate,
          floorNumber: floor,
          companyName: company,
          narration: `Demand Note Receipt (${dn.billingMonth}) – ${studentName} (${rollNo}) – Room ${roomNo}`,
          amount: totalAmt,
          createdBy: 'system@hms.local'
        }
      });

      await prisma.voucherEntry.create({
        data: { voucherId: voucher.id, accountHeadId: drBankHead.id, type: 'DEBIT', amount: totalAmt }
      });

      if (rentAmt > 0) {
        await prisma.voucherEntry.create({
          data: { voucherId: voucher.id, accountHeadId: crRentHead.id, type: 'CREDIT', amount: rentAmt }
        });
      }
      if (messAmt > 0) {
        await prisma.voucherEntry.create({
          data: { voucherId: voucher.id, accountHeadId: crMessHead.id, type: 'CREDIT', amount: messAmt }
        });
      }
      if (elecAmt > 0) {
        await prisma.voucherEntry.create({
          data: { voucherId: voucher.id, accountHeadId: crElecHead.id, type: 'CREDIT', amount: elecAmt }
        });
      }

      syncedDemandNotes++;
    }
  }

  return { syncedInvoices, syncedDemandNotes, totalSynced: syncedInvoices + syncedDemandNotes };
};

// @desc    Trigger explicit sync of invoices and fees to Accounting
// @route   POST /api/v1/accounting/sync
const syncAccounting = async (req, res) => {
  try {
    const stats = await syncAccountingReceipts();
    logActivity({
      req,
      action: 'UPDATE',
      module: 'ACCOUNTING',
      description: `Synchronized accounting ledger (${stats.totalSynced} new receipts recorded)`,
      metadata: stats
    });
    res.json({ message: 'Accounting ledger synchronized successfully', stats });
  } catch (error) {
    console.error('Error syncing accounting:', error);
    res.status(500).json({ message: 'Failed to synchronize accounting ledger' });
  }
};

// @desc    Get Account Heads List
// @route   GET /api/v1/accounting/heads
const getAccountHeads = async (req, res) => {
  try {
    await ensureAccountHeads();
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
    await syncAccountingReceipts();
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
    await syncAccountingReceipts();
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
    await syncAccountingReceipts();
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
    await syncAccountingReceipts();
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

// @desc    Student-Wise General Ledger (Invoices + Demand Notes + Receipts)
// @route   GET /api/v1/accounting/student-ledger/:studentId
const getStudentLedger = async (req, res) => {
  const { studentId } = req.params;
  try {
    await syncAccountingReceipts();
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        room: true,
        demandNotes: { orderBy: { createdAt: 'asc' } },
        invoices: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const entries = [];

    // 1. Invoices (Debit for raised bill; Credit for receipt when paid)
    (student.invoices || []).forEach(inv => {
      const invNo = `#INV-${String(inv.id).split('-')[0].toUpperCase()}`;
      const rent = inv.rentAmount != null ? `Rent ₹${inv.rentAmount}` : '';
      const mess = inv.messAmount != null ? `Mess ₹${inv.messAmount}` : '';
      const elec = inv.electricityAmount != null && inv.electricityAmount > 0 ? `Elec ₹${inv.electricityAmount}` : '';
      const breakdownStr = [rent, mess, elec].filter(Boolean).join(' + ');

      // Debit entry for invoice raised
      entries.push({
        date: inv.createdAt,
        voucherNo: invNo,
        particulars: inv.kind === 'CHARGE' ? `Charge – ${inv.title || 'Other'} – ${invNo}` : `Fee Invoice Raised – ${invNo}${breakdownStr ? ` (${breakdownStr})` : ''}`,
        debit: parseFloat(inv.amount) || 0,
        credit: 0,
        type: 'INVOICE',
        status: inv.status
      });

      // Credit entry for payment if paid
      if (inv.status === 'PAID' && inv.paidAt) {
        entries.push({
          date: inv.paidAt,
          voucherNo: `REC-${String(inv.id).split('-')[0].toUpperCase()}`,
          particulars: `Payment Received against ${invNo}`,
          debit: 0,
          credit: parseFloat(inv.amount) || 0,
          type: 'RECEIPT',
          status: 'PAID'
        });
      }
    });

    // 2. Demand notes as Debit (Dr) entries and Receipts as Credit (Cr)
    (student.demandNotes || []).forEach(dn => {
      entries.push({
        date: dn.createdAt,
        voucherNo: `DN-${dn.billingMonth}`,
        particulars: `Demand Note – ${dn.billingMonth} (Hostel ₹${dn.hostelFee || 0} + Elec ₹${dn.electricityAmount || 0} + Mess ₹${dn.messFee || 0})`,
        debit: parseFloat(dn.totalAmount) || 0,
        credit: 0,
        type: 'DEMAND_NOTE',
        status: dn.status
      });

      if (dn.status === 'PAID' && dn.paidAt) {
        entries.push({
          date: dn.paidAt,
          voucherNo: `REC-${dn.billingMonth}`,
          particulars: `Payment Received – Demand Note ${dn.billingMonth}`,
          debit: 0,
          credit: parseFloat(dn.totalAmount) || 0,
          type: 'RECEIPT',
          status: 'PAID'
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
        phoneNumber: student.phoneNumber,
        rollNumber: student.rollNumber,
        roomNumber: student.room?.roomNumber || 'N/A',
        floorNumber: student.room?.floorNumber || 'N/A',
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

// @desc    Create Voucher Entry (Receipt / Payment / Journal / Contra / Daily Expense)
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
    await ensureAccountHeads();
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
  getStudentLedger,
  createVoucher,
  syncAccounting,
  syncAccountingReceipts
};
