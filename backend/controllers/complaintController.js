const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Submit a complaint (Student only)
// @route   POST /api/complaints
// @access  Private
const createComplaint = async (req, res) => {
  const { category, description, priority } = req.body;

  if (!category || !description) {
    return res.status(400).json({ message: 'Category and description are required' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const complaint = await prisma.complaint.create({
      data: {
        studentId: student.id,
        category,
        description,
        priority: priority || 'MEDIUM',
        status: 'PENDING'
      }
    });

    res.status(201).json(complaint);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Server error filing complaint' });
  }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private (Admin/Warden/Staff only)
const getAllComplaints = async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
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
    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Server error fetching complaints ledger' });
  }
};

// @desc    Get current student's complaints
// @route   GET /api/complaints/my-complaints
// @access  Private
const getMyComplaints = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const complaints = await prisma.complaint.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(complaints);
  } catch (error) {
    console.error('Error fetching student complaints:', error);
    res.status(500).json({ message: 'Server error fetching your complaints' });
  }
};

// @desc    Update complaint status/comments (Warden/Admin only)
// @route   PUT /api/complaints/:id
// @access  Private (Admin/Warden only)
const updateComplaint = async (req, res) => {
  const { id } = req.params;
  const { status, wardenNotes } = req.body;

  if (!status || !['PENDING', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint ticket not found' });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        status,
        wardenNotes: wardenNotes || complaint.wardenNotes
      }
    });

    res.json(updatedComplaint);
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Server error updating ticket' });
  }
};

module.exports = {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  updateComplaint
};
