const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Log a new visitor check-in (Warden/Staff only)
// @route   POST /api/visitors
// @access  Private (Admin/Staff only)
const createVisitor = async (req, res) => {
  const { studentRollNumber, name, phone, relationship } = req.body;

  if (!studentRollNumber || !name || !phone || !relationship) {
    return res.status(400).json({ message: 'Host Student roll number, visitor name, phone, and relationship are required' });
  }

  try {
    // 1. Verify student exists
    const student = await prisma.student.findUnique({
      where: { rollNumber: studentRollNumber }
    });

    if (!student) {
      return res.status(404).json({ message: 'Host Student not found with that roll number' });
    }

    // 2. Create visitor record
    const visitor = await prisma.visitor.create({
      data: {
        studentId: student.id,
        name,
        phone,
        relationship,
        checkInTime: new Date()
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

    res.status(201).json(visitor);
  } catch (error) {
    console.error('Error logging visitor:', error);
    res.status(500).json({ message: 'Server error logging visitor check-in' });
  }
};

// @desc    Get all visitor logs
// @route   GET /api/visitors
// @access  Private
const getAllVisitors = async (req, res) => {
  try {
    const visitors = await prisma.visitor.findMany({
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
        checkInTime: 'desc'
      }
    });
    res.json(visitors);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ message: 'Server error fetching visitor log' });
  }
};

// @desc    Log visitor checkout (Warden/Staff only)
// @route   PUT /api/visitors/:id/checkout
// @access  Private (Admin/Staff only)
const logVisitorCheckout = async (req, res) => {
  const { id } = req.params;

  try {
    const visitor = await prisma.visitor.findUnique({ where: { id } });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor record not found' });
    }

    if (visitor.checkOutTime) {
      return res.status(400).json({ message: 'Visitor has already checked out' });
    }

    const updatedVisitor = await prisma.visitor.update({
      where: { id },
      data: {
        checkOutTime: new Date()
      }
    });

    res.json(updatedVisitor);
  } catch (error) {
    console.error('Error checking out visitor:', error);
    res.status(500).json({ message: 'Server error logging visitor check-out' });
  }
};

module.exports = {
  createVisitor,
  getAllVisitors,
  logVisitorCheckout
};
