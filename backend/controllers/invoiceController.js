const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');
const { COMPANY_CONFIG, FEE_STRUCTURE } = require('../config/companyConfig');

const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK', 'CHEQUE'];

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
      data: { status: 'PAID', paidAt }
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

module.exports = {
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  payInvoice,
  updateInvoice,
  generateMonthlyBillingRun,
  triggerAutoMonthlyInvoices
};

