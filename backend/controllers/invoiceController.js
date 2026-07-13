const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
      where: { rollNumber: studentRollNumber }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found with that roll number' });
    }

    const invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        status: 'UNPAID'
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
      orderBy: { createdAt: 'desc' }
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching student invoices:', error);
    res.status(500).json({ message: 'Server error fetching invoices' });
  }
};

// @desc    Simulate paying an invoice (Student only)
// @route   PUT /api/invoices/:id/pay
// @access  Private
const payInvoice = async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Verify student is paying their own invoice (or Admin is paying it)
    if (req.user.role !== 'ADMIN' && req.user.id !== invoice.student.userId) {
      return res.status(403).json({ message: 'Not authorized to pay this invoice' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ message: 'Invoice has already been paid' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error paying invoice:', error);
    res.status(500).json({ message: 'Server error during mock payment processing' });
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  payInvoice
};
