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
  const { studentRollNumber, amount, dueDate } = req.body;

  if (!studentRollNumber || !amount || !dueDate) {
    return res.status(400).json({ message: 'Student roll number, amount, and due date are required' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { rollNumber: studentRollNumber },
      include: { room: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found with that roll number' });
    }

    const invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        status: 'UNPAID',
        ...billingEntity(student.room)
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(invoice);

    logActivity({ req, action: 'CREATE', module: 'FEE', description: `Raised invoice of ₹${invoice.amount} for ${invoice.student.user.name} (${studentRollNumber})`, targetId: invoice.id, targetType: 'Invoice' });
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

// @desc    Record a payment received against an invoice (Warden only)
// @route   PUT /api/invoices/:id/pay
// @access  Private (Admin/Warden only)
const payInvoice = async (req, res) => {
  const { id } = req.params;
  const { method = 'CASH', reference = '', paidOn } = req.body || {};

  if (!PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({ message: `Payment method must be one of ${PAYMENT_METHODS.join(', ')}` });
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { student: { include: { user: { select: { name: true } } } } }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ message: 'Invoice has already been paid' });
    }

    const paidAt = paidOn ? new Date(paidOn) : new Date();
    if (Number.isNaN(paidAt.getTime()) || paidAt > new Date()) {
      return res.status(400).json({ message: 'Payment date cannot be in the future' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status: 'PAID', paidAt }
    });

    res.json(updatedInvoice);

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
    const billingAmount = (FEE_STRUCTURE.hostel[sharing] || FEE_STRUCTURE.hostel[2]) + FEE_STRUCTURE.mess;

    await prisma.invoice.create({
      data: {
        studentId: student.id,
        amount: billingAmount,
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

module.exports = {
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  payInvoice,
  generateMonthlyBillingRun,
  triggerAutoMonthlyInvoices
};
