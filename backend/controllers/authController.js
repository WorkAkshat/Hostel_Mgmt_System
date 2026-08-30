const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

// Generate JWT Token Helper
const generateToken = (userId, email, role, name, assignedFloor = null) => {
  return jwt.sign(
    { id: userId, email, role, name, assignedFloor },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};


// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  // Normalize domain variations & common typos (e.g. haripushappg.com -> haripushppg.com)
  const rawEmail = email.trim().toLowerCase();
  const normalizedEmail = rawEmail
    .replace('@haripushappg.com', '@haripushppg.com')
    .replace('@haripushphostel.in', '@haripushppg.com');

  try {
    // 1. Find user by email (try normalized first, fallback to raw)
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        student: {
          include: {
            room: true
          }
        },
        staff: true
      }
    });

    if (!user && rawEmail !== normalizedEmail) {
      user = await prisma.user.findUnique({
        where: { email: rawEmail },
        include: {
          student: {
            include: {
              room: true
            }
          },
          staff: true
        }
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 2. Check password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is approved (role does not start with PENDING)
    if (user.role.startsWith('PENDING')) {
      return res.status(401).json({ message: 'Your registration request is pending admin approval.' });
    }

    // 3. Return user data and token
    const token = generateToken(user.id, user.email, user.role, user.name, user.assignedFloor);

    const COMPANY_MAP = {
      1: 'Rajken Enterprises',
      2: 'Vandana Enterprises',
      3: 'Pushpa Enterprises',
      4: 'Harish Chandra Enterprises',
      5: 'Ramesh Enterprises',
    };

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        assignedFloor: user.assignedFloor || null,
        companyName: user.assignedFloor ? COMPANY_MAP[user.assignedFloor] : 'Consolidated View (All Floors)',
        studentDetails: user.student ? {
          id: user.student.id,
          rollNumber: user.student.rollNumber,
          phoneNumber: user.student.phoneNumber,
          parentContact: user.student.parentContact,
          status: user.student.status,
          room: user.student.room ? {
            id: user.student.room.id,
            roomNumber: user.student.room.roomNumber,
            block: user.student.room.block,
            isAc: user.student.room.isAc
          } : null
        } : null,
        staffDetails: user.staff ? {
          id: user.staff.id,
          department: user.staff.department,
          designation: user.staff.designation,
          phoneNumber: user.staff.phoneNumber
        } : null
      }
    });

    // Log successful login
    logActivity({ req, userId: user.id, userName: user.name, userRole: user.role, action: 'LOGIN', module: 'AUTH', description: `${user.name} (${user.role}) logged in`, targetId: user.id, targetType: 'User' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        student: {
          include: {
            room: true
          }
        },
        staff: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentDetails: user.student ? {
        id: user.student.id,
        rollNumber: user.student.rollNumber,
        phoneNumber: user.student.phoneNumber,
        parentContact: user.student.parentContact,
        status: user.student.status,
        room: user.student.room ? {
          id: user.student.room.id,
          roomNumber: user.student.room.roomNumber,
          block: user.student.room.block,
          isAc: user.student.room.isAc
        } : null
      } : null,
      staffDetails: user.staff ? {
        id: user.staff.id,
        department: user.staff.department,
        designation: user.staff.designation,
        phoneNumber: user.staff.phoneNumber
      } : null
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
};

// @desc    Register a new user (pending approval)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    rollNumber,
    phoneNumber,
    parentContact,
    department,
    designation,
    dateOfJoining,
    maritalStatus,
    fatherName,
    dob,
    permanentAddress,
    state,
    pincode,
    coachingCollege
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please provide name, email, password and role.' });
  }

  if (role !== 'STUDENT' && role !== 'STAFF') {
    return res.status(400).json({ message: 'Role must be STUDENT or STAFF.' });
  }

  try {
    // 1. Check if user already exists
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // 2. If student, validate phone numbers and check roll if provided
    let finalRoll = rollNumber;
    if (role === 'STUDENT') {
      if (!phoneNumber || !parentContact) {
        return res.status(400).json({ message: 'Phone and parent contact details are required.' });
      }
      if (!/^[0-9]{10}$/.test(phoneNumber) || !/^[0-9]{10}$/.test(parentContact)) {
        return res.status(400).json({ message: 'Phone and parent contact numbers must be exactly 10 digits.' });
      }
      if (rollNumber) {
        const rollExists = await prisma.student.findUnique({ where: { rollNumber } });
        if (rollExists) {
          return res.status(400).json({ message: 'Student with this roll number already exists' });
        }
      } else {
        finalRoll = `ROLL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
    }

    // 3. If staff, validate fields
    if (role === 'STAFF') {
      if (!department || !designation || !phoneNumber) {
        return res.status(400).json({ message: 'All staff details (department, designation, phone) are required.' });
      }
      if (!/^[0-9]{10}$/.test(phoneNumber)) {
        return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
      }
    }

    // 4. Create User and details in transaction
    const hashedPassword = await bcrypt.hash(password, 10);
    const pendingRole = `PENDING_${role}`;

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: pendingRole,
        }
      });

      if (role === 'STUDENT') {
        await tx.student.create({
          data: {
            userId: user.id,
            rollNumber: finalRoll,
            phoneNumber,
            parentContact,
            status: 'CHECKED_IN',
            dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
            maritalStatus,
            fatherName,
            dob: dob ? new Date(dob) : null,
            permanentAddress,
            state,
            pincode,
            coachingCollege
          }
        });
      } else {
        await tx.staff.create({
          data: {
            userId: user.id,
            department,
            designation,
            phoneNumber
          }
        });
      }

      return user;
    });

    res.status(201).json({
      message: 'Registration request submitted successfully. Waiting for admin approval.',
      userId: newUser.id
    });

    // Log registration
    logActivity({ req, userId: newUser.id, userName: name, userRole: pendingRole, action: 'REGISTER', module: 'AUTH', description: `${name} registered as ${role} (pending approval)`, targetId: newUser.id, targetType: 'User' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// @desc    Get all pending user registrations
// @route   GET /api/auth/pending
// @access  Private (Admin only)
const getPendingApprovals = async (req, res) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: {
        role: {
          startsWith: 'PENDING'
        }
      },
      include: {
        student: true,
        staff: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(pendingUsers);
  } catch (error) {
    console.error('Fetch pending approvals error:', error);
    res.status(500).json({ message: 'Server error fetching pending approvals.' });
  }
};

// @desc    Approve a pending user registration
// @route   POST /api/auth/approve/:id
// @access  Private (Admin only)
const approveUser = async (req, res) => {
  const { id } = req.params;
  const {
    role,
    roomId,
    rollNumber,
    phoneNumber,
    parentContact,
    department,
    designation,
    dateOfJoining,
    maritalStatus,
    fatherName,
    dob,
    permanentAddress,
    state,
    pincode,
    coachingCollege
  } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { student: true, staff: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.role.startsWith('PENDING')) {
      return res.status(400).json({ message: 'User is already approved.' });
    }

    // Determine target role (use provided role, or strip PENDING_ from original)
    const originalRequestedRole = user.role.replace('PENDING_', '');
    const finalRole = role || originalRequestedRole;

    if (finalRole !== 'STUDENT' && finalRole !== 'STAFF' && finalRole !== 'ADMIN') {
      return res.status(400).json({ message: 'Invalid role assigned.' });
    }

    // Phone number validations
    if (finalRole === 'STUDENT' || finalRole === 'STAFF') {
      const phoneToVerify = phoneNumber || user.student?.phoneNumber || user.staff?.phoneNumber;
      if (phoneToVerify && !/^[0-9]{10}$/.test(phoneToVerify)) {
        return res.status(400).json({ message: 'Contact number must be exactly 10 digits.' });
      }
    }
    if (finalRole === 'STUDENT') {
      const parentToVerify = parentContact || user.student?.parentContact;
      if (parentToVerify && !/^[0-9]{10}$/.test(parentToVerify)) {
        return res.status(400).json({ message: 'Parent contact number must be exactly 10 digits.' });
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update user role
      await tx.user.update({
        where: { id },
        data: { role: finalRole }
      });

      // 2. Handle sub-entities based on final role
      if (finalRole === 'STUDENT') {
        // Clean up staff if they were registered as staff
        if (user.staff) {
          await tx.staff.delete({ where: { id: user.staff.id } });
        }

        const studentRoll = rollNumber || user.student?.rollNumber || `ROLL-${Date.now()}`;
        const studentPhone = phoneNumber || user.student?.phoneNumber || '0000000000';
        const studentParent = parentContact || user.student?.parentContact || '0000000000';

        // Check if student record exists, otherwise create
        let studentRecord = user.student;
        if (!studentRecord) {
          studentRecord = await tx.student.create({
            data: {
              userId: id,
              rollNumber: studentRoll,
              phoneNumber: studentPhone,
              parentContact: studentParent,
              status: 'CHECKED_IN',
              dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
              maritalStatus,
              fatherName,
              dob: dob ? new Date(dob) : null,
              permanentAddress,
              state,
              pincode,
              coachingCollege
            }
          });
        } else {
          studentRecord = await tx.student.update({
            where: { id: user.student.id },
            data: {
              rollNumber: studentRoll,
              phoneNumber: studentPhone,
              parentContact: studentParent,
              dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : user.student.dateOfJoining,
              maritalStatus: maritalStatus !== undefined ? maritalStatus : user.student.maritalStatus,
              fatherName: fatherName !== undefined ? fatherName : user.student.fatherName,
              dob: dob ? new Date(dob) : user.student.dob,
              permanentAddress: permanentAddress !== undefined ? permanentAddress : user.student.permanentAddress,
              state: state !== undefined ? state : user.student.state,
              pincode: pincode !== undefined ? pincode : user.student.pincode,
              coachingCollege: coachingCollege !== undefined ? coachingCollege : user.student.coachingCollege
            }
          });
        }

        // Room capacity check and assignment
        if (roomId) {
          const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { students: true }
          });

          if (!room) {
            throw new Error('Selected room not found');
          }

          const currentOccupancy = room.students.filter(s => s.id !== studentRecord.id).length;
          if (currentOccupancy >= room.sharingType) {
            throw new Error('Selected room is full');
          }

          await tx.student.update({
            where: { id: studentRecord.id },
            data: { roomId }
          });

          // Mark room full if capacity reached
          if (currentOccupancy + 1 >= room.sharingType) {
            await tx.room.update({
              where: { id: roomId },
              data: { status: 'FULL' }
            });
          }
        }

      } else if (finalRole === 'STAFF') {
        // Clean up student if they were registered as student
        if (user.student) {
          // If they were in a room, make the room available
          if (user.student.roomId) {
            await tx.room.update({
              where: { id: user.student.roomId },
              data: { status: 'AVAILABLE' }
            });
          }
          await tx.student.delete({ where: { id: user.student.id } });
        }

        const staffDept = department || user.staff?.department || 'Maintenance';
        const staffDesg = designation || user.staff?.designation || 'Staff Member';
        const staffPhone = phoneNumber || user.staff?.phoneNumber || '0000000000';

        if (!user.staff) {
          await tx.staff.create({
            data: {
              userId: id,
              department: staffDept,
              designation: staffDesg,
              phoneNumber: staffPhone
            }
          });
        } else {
          await tx.staff.update({
            where: { id: user.staff.id },
            data: {
              department: staffDept,
              designation: staffDesg,
              phoneNumber: staffPhone
            }
          });
        }

      } else if (finalRole === 'ADMIN') {
        // Clean up both
        if (user.student) {
          if (user.student.roomId) {
            await tx.room.update({
              where: { id: user.student.roomId },
              data: { status: 'AVAILABLE' }
            });
          }
          await tx.student.delete({ where: { id: user.student.id } });
        }
        if (user.staff) {
          await tx.staff.delete({ where: { id: user.staff.id } });
        }
      }
    });

    res.json({ message: `User approved successfully as ${finalRole}.` });

    // Log approval
    logActivity({ req, action: 'APPROVE', module: 'AUTH', description: `Approved ${user.name} (${user.email}) as ${finalRole}`, targetId: id, targetType: 'User' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: error.message || 'Server error approving user.' });
  }
};

// @desc    Reject and delete a pending user registration
// @route   POST /api/auth/reject/:id
// @access  Private (Admin only)
const rejectUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.role.startsWith('PENDING')) {
      return res.status(400).json({ message: 'Only pending registrations can be rejected.' });
    }

    // Delete user (Prisma cascades deletion of Student/Staff due to onDelete: Cascade)
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Registration rejected and user deleted successfully.' });

    // Log rejection
    logActivity({ req, action: 'REJECT', module: 'AUTH', description: `Rejected registration of ${user.name} (${user.email})`, targetId: id, targetType: 'User' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ message: 'Server error rejecting user.' });
  }
};

// @desc    Logout user (client clears token; server can blacklist in future)
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  // JWT is stateless — the client must delete the token from storage.
  // This endpoint provides an audit hook and a clean contract for future
  // server-side token blacklisting (Redis / DB).
  try {
    console.log(`[Auth] User ${req.user?.email} logged out at ${new Date().toISOString()}`);
    logActivity({ req, action: 'LOGOUT', module: 'AUTH', description: `${req.user?.name || req.user?.email} logged out` });
    res.json({ success: true, message: 'Logged out successfully. Please clear your client token.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout.' });
  }
};

// @desc    Refresh JWT token silently (extend session)
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = async (req, res) => {
  try {
    // req.user is populated by the protect middleware, so we know the token is valid
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { student: { include: { room: true } }, staff: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Don't allow refresh if account is still pending
    if (user.role.startsWith('PENDING')) {
      return res.status(401).json({ message: 'Account is pending approval.' });
    }

    const newToken = generateToken(user.id, user.email, user.role);

    res.json({
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentDetails: user.student ? {
          id: user.student.id,
          rollNumber: user.student.rollNumber,
          phoneNumber: user.student.phoneNumber,
          parentContact: user.student.parentContact,
          fatherName: user.student.fatherName,
          permanentAddress: user.student.permanentAddress,
          state: user.student.state,
          pincode: user.student.pincode,
          coachingCollege: user.student.coachingCollege,
          status: user.student.status,
          room: user.student.room ? {
            id: user.student.room.id,
            roomNumber: user.student.room.roomNumber,
            block: user.student.room.block,
            isAc: user.student.room.isAc
          } : null
        } : null,
        staffDetails: user.staff ? {
          id: user.staff.id,
          department: user.staff.department,
          designation: user.staff.designation,
          phoneNumber: user.staff.phoneNumber
        } : null
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error refreshing token.' });
  }
};

// @desc    Update push token for push notifications
// @route   POST /api/v1/auth/push-token
// @access  Private
const updatePushToken = async (req, res) => {
  const { pushToken } = req.body;
  const userId = req.user.id;

  if (!pushToken) {
    return res.status(400).json({ message: 'Push token is required.' });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken }
    });

    res.json({ success: true, message: 'Push token registered successfully.' });
  } catch (error) {
    console.error('Error updating push token:', error.message);
    res.status(500).json({ message: 'Server error saving push token.' });
  }
};

// @desc    Test Push Notification Trigger
// @route   POST /api/v1/auth/test-push
// @access  Public
const testPushNotification = async (req, res) => {
  const { broadcastPushNotification } = require('../services/pushService');
  const { title, body } = req.body;
  const pushTitle = title || '📢 Hari Pushp PG Alert';
  const pushBody = body || 'High-priority alert! New updates available in your hostel dashboard.';

  try {
    await broadcastPushNotification({
      title: pushTitle,
      body: pushBody,
      data: { type: 'TEST_ALERT' }
    });

    res.json({
      success: true,
      message: 'High-priority push notification dispatched successfully!',
      title: pushTitle,
      body: pushBody
    });
  } catch (error) {
    console.error('Error dispatching test push notification:', error.message);
    res.status(500).json({ message: 'Error triggering push notification.' });
  }
};

module.exports = {
  loginUser,
  getMe,
  registerUser,
  getPendingApprovals,
  approveUser,
  rejectUser,
  logoutUser,
  refreshToken,
  updatePushToken,
  testPushNotification
};

