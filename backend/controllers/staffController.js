const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// @desc    Get all staff roster
// @route   GET /api/staff
// @access  Private
const getAllStaff = async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff roster:', error);
    res.status(500).json({ message: 'Server error fetching staff roster' });
  }
};

// @desc    Register a new staff member (Warden only)
// @route   POST /api/staff
// @access  Private (Admin/Warden only)
const createStaff = async (req, res) => {
  const { name, email, password, department, designation, phoneNumber } = req.body;

  if (!name || !email || !password || !department || !designation || !phoneNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStaff = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'STAFF',
        }
      });

      return await tx.staff.create({
        data: {
          userId: user.id,
          department,
          designation,
          phoneNumber
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
    });

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Server error creating staff entry' });
  }
};

// @desc    Delete staff member (Warden only)
// @route   DELETE /api/staff/:id
// @access  Private (Admin/Warden only)
const deleteStaff = async (req, res) => {
  const { id } = req.params;

  try {
    const staff = await prisma.staff.findUnique({ where: { id } });

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated user (which cascades staff records)
      await tx.user.delete({
        where: { id: staff.userId }
      });
    });

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Server error deleting staff entry' });
  }
};

module.exports = {
  getAllStaff,
  createStaff,
  deleteStaff
};
