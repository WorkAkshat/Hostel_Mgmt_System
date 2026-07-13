const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Generate JWT Token Helper
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET || 'super_secret_hostel_key_2026_xyz',
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

  try {
    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
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
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 2. Check password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Return user data and token
    const token = generateToken(user.id, user.email, user.role);

    res.json({
      token,
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
    console.error('Login error:', error);
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

module.exports = {
  loginUser,
  getMe,
};
