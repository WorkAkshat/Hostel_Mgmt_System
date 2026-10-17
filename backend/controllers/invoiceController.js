const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');
const { COMPANY_CONFIG, FEE_STRUCTURE } = require('../config/companyConfig');

const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK', 'CHEQUE'];
const CHARGE_CATEGORIES = ['FINE', 'DAMAGE', 'DEPOSIT', 'LATE_FEE', 'EXTRA', 'ADVANCE', 'OTHER'];
const CHARGE_LABELS = { FINE: 'Fine', DAMAGE: 'Damage', DEPOSIT: 'Security deposit', LATE_FEE: 'Late fee', EXTRA: 'Extra service', ADVANCE: 'Advance payment', OTHER: 'Other' };

// Floor + billing company for a student's room, stored on the invoice
const billingEntity = (room) => {
  const floorNumber = room?.floorNumber || null;
  const company = floorNumber ? COMPANY_CONFIG[floorNumber] : null;
  return { floorNumber, companyName: company?.companyName || null };
};

// @desc    Generate a fee invoice for a student (Warden only)
// @route   POST /api/invoices
// @access  Private (Admin/Warden only)
const createInvoice = async (req, res) => {
  const { studentRollNumber, amount, dueDate, rentAmount, messAmount, electricityAmount } = req.body;

  if (!studentRollNumber || !dueDate) {
    return res.status(400).json({ message: 'Student roll number and due date are required' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { rollNumber: studentRollNumber },
      include: { room: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found with that roll number' });
    }

    const sharing = student.room?.sharingType || student.room?.capacity || 2;
    const defaultRent = FEE_STRUCTURE.hostel[sharing] || 11000;
    const defaultMess = FEE_STRUCTURE.mess || 3000;

    let finalRent = rentAmount !== undefined && rentAmount !== null && rentAmount !== '' ? parseFloat(rentAmount) : null;
    let finalMess = messAmount !== undefined && messAmount !== null && messAmount !== '' ? parseFloat(messAmount) : null;
    let finalElec = electricityAmount !== undefined && electricityAmount !== null && electricityAmount !== '' ? parseFloat(electricityAmount) : 0;

    let finalTotal = amount ? parseFloat(amount) : 0;

    if (finalRent !== null || finalMess !== null || finalElec !== null) {
      finalRent = finalRent ?? defaultRent;
      finalMess = finalMess ?? defaultMess;
      finalElec = finalElec ?? 0;
      finalTotal = finalRent + finalMess + finalElec;
    } else if (finalTotal > 0) {
      finalRent = defaultRent;
      finalMess = defaultMess;
      finalElec = Math.max(0, finalTotal - finalRent - finalMess);
    } else {
      finalRent = defaultRent;
      finalMess = defaultMess;
      finalElec = 0;
      finalTotal = finalRent + finalMess;
    }

    const invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        amount: finalTotal,
        rentAmount: finalRent,
        messAmount: finalMess,
        electricityAmount: finalElec,
        dueDate: new Date(dueDate),
        status: 'UNPAID',
        ...billingEntity(student.room)
      },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            room: true
          }
        }
      }
    });

    res.status(201).json(invoice);

    logActivity({ req, action: 'CREATE', module: 'FEE', description: `Raised invoice of ₹${invoice.amount} (Rent: ₹${finalRent}, Mess: ₹${finalMess}, Elec: ₹${finalElec}) for ${invoice.student.user.name} (${studentRollNumber})`, targetId: invoice.id, targetType: 'Invoice' });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Server error generating fee invoice' });
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (Admin/Warden only)
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true
              }
            },
            room: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Server error fetching invoices ledger' });
  }
};

// @desc    Get current student's invoices
// @route   GET /api/invoices/my-invoices
// @access  Private
const getMyInvoices = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { studentId: student.id },
      include: { student: { include: { user: { select: { name: true } }, room: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching student invoices:', error);
    res.status(500).json({ message: 'Server error fetching invoices' });
  }
};

// @desc    Record a payment against an invoice (Admin records cash; Student pays online)
// @route   PUT /api/invoices/:id/pay
// @access  Private (Admin or Student — student can only pay their own)
const payInvoice = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';
  const method = req.body?.method || (isAdmin ? 'CASH' : 'ONLINE');
  const { reference = '', paidOn } = req.body || {};

  const validMethods = [...PAYMENT_METHODS, 'ONLINE', 'CARD'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ message: `Payment method must be one of ${validMethods.join(', ')}` });
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { student: { include: { user: { select: { name: true, id: true } } } } }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Students can only pay their own invoice
    if (!isAdmin) {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student || invoice.studentId !== student.id) {
        return res.status(403).json({ message: 'You can only pay your own invoices' });
      }
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ message: 'Invoice has already been paid' });
    }

    const paidAt = paidOn ? new Date(paidOn) : new Date();
    if (Number.isNaN(paidAt.getTime()) || (isAdmin && paidAt > new Date())) {
      return res.status(400).json({ message: 'Payment date cannot be in the future' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status: 'PAID', paidAt, payMethod: method, payReference: String(reference || '').trim() || null }
    });

    res.json(updatedInvoice);

    // Sync to Tally ledger immediately
    const { syncAccountingReceipts } = require('./accountingController');
    syncAccountingReceipts().catch(err => console.error('Failed to auto-sync invoice payment voucher:', err));

    const ref = String(reference).trim();
    logActivity({
      req,
      action: 'PAYMENT',
      module: 'FEE',
      description: `Recorded ₹${invoice.amount} from ${invoice.student.user.name} via ${method}${ref ? ` (ref ${ref})` : ''}`,
      targetId: id,
      targetType: 'Invoice',
      metadata: { method, reference: ref, paidAt }
    });
  } catch (error) {
    console.error('Error recording invoice payment:', error);
    res.status(500).json({ message: 'Server error recording the payment' });
  }
};

// Helper & controller for automated month-end invoicing
const generateMonthlyBillingRun = async () => {
  const today = new Date();
  const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  // Due date: 5th of next month
  const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);

  // Fetch all approved students (whose user approval is done -> user.role === 'STUDENT')
  const approvedStudents = await prisma.student.findMany({
    where: {
      user: {
        role: 'STUDENT'
      }
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true }
      },
      room: true
    }
  });

  let generatedCount = 0;
  let skippedCount = 0;

  for (const student of approvedStudents) {
    // Check if invoice created within current billing month already exists for this student
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        studentId: student.id,
        kind: 'FEE',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    if (existingInvoice) {
      skippedCount++;
      continue;
    }

    if (!student.room) {
      skippedCount++;
      continue;
    }

    // Standard monthly fee: room rent for the sharing type + catering
    const sharing = student.room.sharingType || student.room.capacity;
    const roomRent = (FEE_STRUCTURE.hostel[sharing] || FEE_STRUCTURE.hostel[2]);
    const messFee = FEE_STRUCTURE.mess;
    const billingAmount = roomRent + messFee;

    await prisma.invoice.create({
      data: {
        studentId: student.id,
        amount: billingAmount,
        rentAmount: roomRent,
        messAmount: messFee,
        electricityAmount: 0,
        dueDate,
        status: 'UNPAID',
        ...billingEntity(student.room)
      }
    });

    generatedCount++;
  }

  return { monthName, totalApprovedStudents: approvedStudents.length, generatedCount, skippedCount };
};

// @desc    Trigger automated month-end invoicing for all approved students (Warden/Admin)
// @route   POST /api/invoices/auto-generate-monthly
// @access  Private (Admin/Warden only)
const triggerAutoMonthlyInvoices = async (req, res) => {
  try {
    const result = await generateMonthlyBillingRun();
    logActivity({ req, action: 'CREATE', module: 'FEE', description: `Month-end billing for ${result.monthName}: ${result.generatedCount} invoices raised`, metadata: result });
    res.json({
      message: `Automated month-end billing complete for ${result.monthName}. Generated ${result.generatedCount} invoices (${result.skippedCount} students already billed).`,
      result
    });
  } catch (error) {
    console.error('Error running auto monthly billing:', error);
    res.status(500).json({ message: 'Server error during automated monthly invoice generation' });
  }
};

// @desc    Update an invoice's components (rent, mess, electricity) – Admin only
// @route   PUT /api/invoices/:id
// @access  Private (Admin only)
const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { rentAmount, messAmount, electricityAmount, dueDate } = req.body || {};

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { student: { include: { user: { select: { name: true } } } } }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ message: 'Cannot edit a paid invoice' });
    }

    // A one-off charge has no rent / mess split: edit its amount, title, note or due date
    if (invoice.kind === 'CHARGE') {
      const { amount, title, note } = req.body || {};
      const data = {};
      if (amount !== undefined) {
        const a = Math.round(parseFloat(amount) * 100) / 100;
        if (!(a > 0) || a > 1000000) return res.status(400).json({ message: 'Amount must be between ₹1 and ₹10,00,000.' });
        data.amount = a;
      }
      if (title !== undefined) {
        const t = String(title).trim();
        if (t.length < 2 || t.length > 80) return res.status(400).json({ message: 'Write what this charge is for (2–80 characters).' });
        data.title = t;
      }
      if (note !== undefined) data.note = String(note).trim().slice(0, 300) || null;
      if (dueDate) data.dueDate = new Date(dueDate);
      const updated = await prisma.invoice.update({ where: { id }, data, include: { student: { include: { user: { select: { name: true } }, room: true } } } });
      logActivity({ req, action: 'UPDATE', module: 'FEE', description: `Edited charge “${updated.title}” for ${invoice.student.user.name}: ₹${updated.amount}`, targetId: id, targetType: 'Invoice' });
      return res.json(updated);
    }

    const data = {};

    // Accept individual components and recompute total
    const rent = rentAmount !== undefined ? parseFloat(rentAmount) : null;
    const mess = messAmount !== undefined ? parseFloat(messAmount) : null;
    const elec = electricityAmount !== undefined ? parseFloat(electricityAmount) : null;

    if (rent !== null && !isNaN(rent)) data.rentAmount = rent;
    if (mess !== null && !isNaN(mess)) data.messAmount = mess;
    if (elec !== null && !isNaN(elec)) data.electricityAmount = elec;

    // Recompute total from components (use existing value if component not updated)
    const effectiveRent = data.rentAmount ?? invoice.rentAmount ?? 0;
    const effectiveMess = data.messAmount ?? invoice.messAmount ?? 0;
    const effectiveElec = data.electricityAmount ?? invoice.electricityAmount ?? 0;
    const newTotal = effectiveRent + effectiveMess + effectiveElec;
    if (newTotal > 0) data.amount = newTotal;

    if (dueDate) data.dueDate = new Date(dueDate);

    const updated = await prisma.invoice.update({
      where: { id },
      data,
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            room: true
          }
        }
      }
    });

    logActivity({
      req,
      action: 'UPDATE',
      module: 'FEE',
      description: `Edited invoice for ${invoice.student.user.name}: Rent ₹${data.rentAmount ?? '-'}, Mess ₹${data.messAmount ?? '-'}, Elec ₹${data.electricityAmount ?? '-'}, Total ₹${updated.amount}`,
      targetId: id,
      targetType: 'Invoice'
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Server error updating invoice' });
  }
};

// @desc    Ask a resident for money (fine, damage, deposit…) or record money they paid
//          that isn't for a bill. With paid=true it is saved as already paid, with a receipt.
// @route   POST /api/invoices/charge
// @access  Private (Admin only)
const createCharge = async (req, res) => {
  const { studentId, category = 'OTHER', title, amount, dueDate, note, paid, method = 'CASH', reference = '', paidOn } = req.body || {};

  if (!studentId) return res.status(400).json({ message: 'Choose the resident.' });
  if (!CHARGE_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Choose what kind of charge this is.' });
  const a = Math.round(parseFloat(amount) * 100) / 100;
  if (!(a > 0) || a > 1000000) return res.status(400).json({ message: 'Enter an amount between ₹1 and ₹10,00,000.' });
  const t = String(title || CHARGE_LABELS[category]).trim();
  if (t.length < 2 || t.length > 80) return res.status(400).json({ message: 'Write what this is for (2–80 characters).' });
  const ref = String(reference || '').trim();

  let due = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 86400000);
  if (Number.isNaN(due.getTime())) return res.status(400).json({ message: 'The due date is not valid.' });

  let paidAt = null;
  if (paid) {
    if (!PAYMENT_METHODS.includes(method)) return res.status(400).json({ message: `Payment method must be one of ${PAYMENT_METHODS.join(', ')}` });
    if (method !== 'CASH' && ref.length < 4) return res.status(400).json({ message: 'Enter the transaction / cheque reference so the payment can be traced.' });
    paidAt = paidOn ? new Date(paidOn) : new Date();
    if (Number.isNaN(paidAt.getTime()) || paidAt > new Date(Date.now() + 86400000)) return res.status(400).json({ message: 'Payment date cannot be in the future.' });
    due = paidAt;
  }

  try {
    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { room: true, user: { select: { name: true } } } });
    if (!student) return res.status(404).json({ message: 'Resident not found.' });

    const invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        kind: 'CHARGE',
        category,
        title: t,
        note: String(note || '').trim().slice(0, 300) || null,
        amount: a,
        dueDate: due,
        status: paid ? 'PAID' : 'UNPAID',
        paidAt,
        payMethod: paid ? method : null,
        payReference: paid ? ref || null : null,
        ...billingEntity(student.room),
      },
      include: { student: { include: { user: { select: { name: true } }, room: true } } },
    });

    res.status(201).json(invoice);

    if (paid) {
      const { syncAccountingReceipts } = require('./accountingController');
      syncAccountingReceipts().catch((err) => console.error('Failed to sync charge receipt:', err));
    }
    logActivity({
      req,
      action: paid ? 'PAYMENT' : 'CREATE',
      module: 'FEE',
      description: paid
        ? `Recorded ₹${a} from ${student.user.name} for “${t}” via ${method}${ref ? ` (ref ${ref})` : ''}`
        : `Asked ${student.user.name} to pay ₹${a} for “${t}”`,
      targetId: invoice.id,
      targetType: 'Invoice',
    });
  } catch (error) {
    console.error('Error creating charge:', error);
    res.status(500).json({ message: 'Server error saving the charge' });
  }
};

// @desc    Cancel a charge raised by mistake (only while unpaid)
// @route   DELETE /api/invoices/:id
// @access  Private (Admin only)
const deleteCharge = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { student: { include: { user: { select: { name: true } } } } } });
    if (!invoice) return res.status(404).json({ message: 'Bill not found.' });
    if (invoice.kind !== 'CHARGE') return res.status(400).json({ message: 'Only extra charges can be cancelled. Edit a monthly fee bill instead.' });
    if (invoice.status === 'PAID') return res.status(400).json({ message: 'This charge is already paid and cannot be cancelled.' });
    await prisma.paymentClaim.deleteMany({ where: { billKind: 'INVOICE', billId: invoice.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });
    res.json({ success: true, message: 'Charge cancelled.' });
    logActivity({ req, action: 'DELETE', module: 'FEE', description: `Cancelled charge “${invoice.title}” (₹${invoice.amount}) for ${invoice.student.user.name}`, targetId: invoice.id, targetType: 'Invoice' });
  } catch (error) {
    console.error('Error cancelling charge:', error);
    res.status(500).json({ message: 'Server error cancelling the charge' });
  }
};

module.exports = {
  createCharge,
  deleteCharge,
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  payInvoice,
  updateInvoice,
  generateMonthlyBillingRun,
  triggerAutoMonthlyInvoices
};

