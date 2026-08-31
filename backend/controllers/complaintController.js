const { PrismaClient } = require('@prisma/client');
const { sendPushNotification } = require('../services/pushService');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

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

    logActivity({ req, action: 'CREATE', module: 'COMPLAINT', description: `Filed complaint: ${category} — ${description.substring(0, 80)}`, targetId: complaint.id, targetType: 'Complaint' });
  } catch (error) {
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
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, pushToken: true }
            }
          }
        }
      }
    });

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

    // Send High-Priority Targeted Push Notification to Student
    if (complaint.student && complaint.student.user && complaint.student.user.pushToken) {
      sendPushNotification({
        pushTokens: complaint.student.user.pushToken,
        title: `🛠️ Complaint Ticket Update (${status})`,
        body: `Your complaint for "${complaint.category}" is now ${status.toLowerCase().replace('_', ' ')}.`,
        data: { type: 'COMPLAINT_STATUS', complaintId: complaint.id }
      }).catch(err => console.warn('[Complaint Push Error]', err.message));
    }

    res.json(updatedComplaint);

    logActivity({ req, action: 'UPDATE', module: 'COMPLAINT', description: `Updated complaint status to ${status} (${complaint.category})`, targetId: id, targetType: 'Complaint' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating ticket' });
  }
};

const { sendMail } = require('../utils/mail');

const forwardDeveloperComplaint = async (req, res) => {
  const { id } = req.params;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true }
            },
            room: true
          }
        }
      }
    });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint ticket not found' });
    }

    const devEmail = process.env.DEVELOPER_EMAIL || 'developer.hms@gmail.com';
    const emailSubject = `[HMS Bug Report] Ticket #${complaint.id.slice(0, 8)} - ${complaint.category}`;
    
    const emailBody = `
Dear Developer,

A new technical/app issue has been reported in the Hostel Management System and forwarded to you.

=================== COMPLAINT TICKET DETAILS ===================
Ticket ID:   ${complaint.id}
Category:    ${complaint.category}
Priority:    ${complaint.priority}
Filed Date:  ${new Date(complaint.createdAt).toLocaleString()}
Status:      ${complaint.status}

=================== STUDENT REPORTING DETAILS ==================
Student Name:  ${complaint.student?.user?.name || 'N/A'}
Roll Number:   ${complaint.student?.rollNumber || 'N/A'}
Email:         ${complaint.student?.user?.email || 'N/A'}
Room Details:  Room ${complaint.student?.room?.roomNumber || 'N/A'} (${complaint.student?.room?.block || 'N/A'} Block)

====================== ISSUE DESCRIPTION =======================
"${complaint.description}"
================================================================

Please investigate this report.

Regards,
HMS Warden Panel
`;

    // Send the email
    await sendMail({
      to: devEmail,
      subject: emailSubject,
      text: emailBody
    });

    // Update complaint notes
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        wardenNotes: `[Escalated to Developer on ${new Date().toLocaleDateString()}] ${complaint.wardenNotes || ''}`.trim()
      }
    });

    res.json({ message: 'Ticket successfully forwarded to Developer email queue', complaint: updated });
  } catch (error) {
    console.error('Error forwarding developer complaint:', error);
    res.status(500).json({ message: 'Failed to forward ticket to Developer' });
  }
};

module.exports = {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  updateComplaint,
  forwardDeveloperComplaint
};
