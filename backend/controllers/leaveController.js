const { PrismaClient } = require('@prisma/client');
const { sendPushNotification } = require('../services/pushService');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

// @desc    Apply for a leave / gate pass (Student only)
// @route   POST /api/leaves
// @access  Private
const createLeaveRequest = async (req, res) => {
  const { startDate, endDate, type, reason } = req.body;

  if (!startDate || !endDate || !reason) {
    return res.status(400).json({ message: 'Start date, end date, and reason are required' });
  }

  try {
    // Find the associated Student model
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        studentId: student.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type || 'NIGHT_OUT',
        reason,
        status: 'PENDING'
      }
    });

    res.status(201).json(leaveRequest);

    logActivity({ req, action: 'CREATE', module: 'LEAVE', description: `Applied for ${type || 'NIGHT_OUT'} leave: ${reason}`, targetId: leaveRequest.id, targetType: 'LeaveRequest' });
  } catch (error) {
    res.status(500).json({ message: 'Server error applying for leave' });
  }
};

// @desc    Get all leave requests
// @route   GET /api/leaves
// @access  Private (Admin/Warden/Staff only)
const getAllLeaveRequests = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const cursor = req.query.cursor;

    const queryOptions = {
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            },
            room: true
          }
        }
      },
      orderBy: { id: 'desc' }
    };

    if (limit !== null) {
      queryOptions.take = limit + 1;
      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }
    }

    const leaves = await prisma.leaveRequest.findMany(queryOptions);

    if (limit !== null) {
      let nextCursor = null;
      let hasMore = false;
      if (leaves.length > limit) {
        hasMore = true;
        nextCursor = leaves[limit - 1].id;
        leaves.pop();
      }
      return res.json({
        data: leaves,
        nextCursor,
        hasMore
      });
    }

    res.json(leaves);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ message: 'Server error fetching leave requests' });
  }
};

// @desc    Get leave requests of logged in student
// @route   GET /api/leaves/my-leaves
// @access  Private
const getMyLeaveRequests = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(leaves);
  } catch (error) {
    console.error('Error fetching student leaves:', error);
    res.status(500).json({ message: 'Server error fetching leaves log' });
  }
};

// @desc    Approve or Reject leave request (Warden/Admin only)
// @route   PUT /api/leaves/:id/status
// @access  Private (Admin/Warden only)
const updateLeaveRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body;

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (APPROVED or REJECTED) is required' });
  }

  try {
    const leave = await prisma.leaveRequest.findUnique({
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

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        comments: comments || null,
        approvedBy: req.user.name
      }
    });

    // Send targeted push notification to student about leave status
    if (leave.student?.user?.pushToken) {
      const isApproved = status === 'APPROVED';
      sendPushNotification({
        pushTokens: leave.student.user.pushToken,
        title: isApproved ? '✅ Leave Approved!' : '❌ Leave Declined',
        body: isApproved
          ? `Your leave request has been approved by ${req.user.name}. Have a safe trip!`
          : `Your leave request was declined by ${req.user.name}.${comments ? ' ' + comments : ''}`,
        data: { type: 'LEAVE_STATUS', leaveId: leave.id, status },
        channelId: 'leave-status',
      }).catch(err => console.warn('[Leave Push Error]', err.message));
    }

    res.json(updatedLeave);

    logActivity({ req, action: status === 'APPROVED' ? 'APPROVE' : 'REJECT', module: 'LEAVE', description: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} leave request (${leave.type})${comments ? ' — ' + comments : ''}`, targetId: id, targetType: 'LeaveRequest' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating status' });
  }
};

// @desc    Log exit checkout timestamp (Warden/Staff only)
// @route   PUT /api/leaves/:id/checkout
// @access  Private (Admin/Staff only)
const logCheckout = async (req, res) => {
  const { id } = req.params;

  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leave.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Leave request must be APPROVED before checkout' });
    }

    const updatedLeave = await prisma.$transaction(async (tx) => {
      // 1. Update Student status to CHECKED_OUT
      await tx.student.update({
        where: { id: leave.studentId },
        data: { status: 'CHECKED_OUT' }
      });

      // 2. Set checkout time and change gate status
      return await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'CHECKED_OUT',
          checkOutTime: new Date()
        }
      });
    });

    res.json(updatedLeave);

    logActivity({ req, action: 'CHECKOUT', module: 'LEAVE', description: `Student checked out (Gate exit) for leave ${leave.type}`, targetId: id, targetType: 'LeaveRequest' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during gate check-out' });
  }
};

// @desc    Log return checkin timestamp (Warden/Staff only)
// @route   PUT /api/leaves/:id/checkin
// @access  Private (Admin/Staff only)
const logCheckin = async (req, res) => {
  const { id } = req.params;

  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id }
    });

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leave.status !== 'CHECKED_OUT') {
      return res.status(400).json({ message: 'Student is not currently logged as Checked Out' });
    }

    const updatedLeave = await prisma.$transaction(async (tx) => {
      // 1. Reset student check-in status
      await tx.student.update({
        where: { id: leave.studentId },
        data: { status: 'CHECKED_IN' }
      });

      // 2. Log gate checkin time and set status
      return await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'RETURNED',
          checkInTime: new Date()
        }
      });
    });

    res.json(updatedLeave);

    logActivity({ req, action: 'CHECKIN', module: 'LEAVE', description: `Student returned (Gate check-in) from leave`, targetId: id, targetType: 'LeaveRequest' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during gate check-in' });
  }
};

// @desc    Biometric Gate Pass check-out/in simulation
// @route   POST /api/leaves/biometric-verify
// @access  Public
const biometricVerifyGate = async (req, res) => {
  const { rollNumber, method } = req.body;

  if (!rollNumber) {
    return res.status(400).json({ message: 'Roll number is required for biometric scan' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { rollNumber },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Biometric template not found: Student roll number is not registered.' });
    }

    const now = new Date();

    if (student.status === 'CHECKED_IN') {
      const activeLeave = await prisma.leaveRequest.findFirst({
        where: {
          studentId: student.id,
          status: 'APPROVED',
          startDate: { lte: now }
        },
        orderBy: { startDate: 'desc' }
      });

      if (!activeLeave) {
        return res.status(400).json({
          message: 'Biometric Access Denied: No pre-approved gate pass found. Please apply for leave first.'
        });
      }

      await prisma.$transaction([
        prisma.student.update({
          where: { id: student.id },
          data: { status: 'CHECKED_OUT' }
        }),
        prisma.leaveRequest.update({
          where: { id: activeLeave.id },
          data: {
            status: 'CHECKED_OUT',
            checkOutTime: now
          }
        })
      ]);

      return res.json({
        success: true,
        action: 'CHECK_OUT',
        studentName: student.user.name,
        message: `Biometric Checkout Verified via ${method || 'FINGERPRINT'}. Gate Barrier Open.`
      });

    } else if (student.status === 'CHECKED_OUT') {
      const activeLeave = await prisma.leaveRequest.findFirst({
        where: {
          studentId: student.id,
          status: 'CHECKED_OUT'
        },
        orderBy: { checkOutTime: 'desc' }
      });

      if (!activeLeave) {
        await prisma.student.update({
          where: { id: student.id },
          data: { status: 'CHECKED_IN' }
        });
        return res.json({
          success: true,
          action: 'CHECK_IN',
          studentName: student.user.name,
          message: 'Biometric check-in reset. Welcome back.'
        });
      }

      await prisma.$transaction([
        prisma.student.update({
          where: { id: student.id },
          data: { status: 'CHECKED_IN' }
        }),
        prisma.leaveRequest.update({
          where: { id: activeLeave.id },
          data: {
            status: 'RETURNED',
            checkInTime: now
          }
        })
      ]);

      return res.json({
        success: true,
        action: 'CHECK_IN',
        studentName: student.user.name,
        message: `Biometric Check-in Verified via ${method || 'FINGERPRINT'}. Welcome back.`
      });

    } else {
      return res.status(400).json({
        message: `Biometric Access Denied: Student status is ${student.status}. Contact warden.`
      });
    }
  } catch (error) {
    console.error('Biometric gate error:', error);
    res.status(500).json({ message: 'Server error during biometric verification' });
  }
};

module.exports = {
  createLeaveRequest,
  getAllLeaveRequests,
  getMyLeaveRequests,
  updateLeaveRequestStatus,
  logCheckout,
  logCheckin,
  biometricVerifyGate
};

