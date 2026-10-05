const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../utils/activityLogger');

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
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            createdAt: true
          }
        }
      },
      orderBy: { user: { name: 'asc' } }
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

    logActivity({ req, action: 'CREATE', module: 'STAFF', description: `Added staff ${name} (${department} - ${designation})`, targetId: newStaff.id, targetType: 'Staff' });
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

    logActivity({ req, action: 'DELETE', module: 'STAFF', description: `Deleted staff member (${staff.department} - ${staff.designation})`, targetId: id, targetType: 'Staff' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Server error deleting staff entry' });
  }
};

// @desc    Update a staff member's details (Warden only)
// @route   PUT /api/staff/:id
// @access  Private (Admin/Warden only)
const updateStaff = async (req, res) => {
  const { id } = req.params;
  const { name, department, designation, phoneNumber } = req.body || {};

  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ message: 'Name cannot be empty' });
  }

  try {
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (name !== undefined) {
        await tx.user.update({ where: { id: staff.userId }, data: { name: String(name).trim() } });
      }
      const data = {};
      if (department) data.department = department;
      if (designation) data.designation = String(designation).trim();
      if (phoneNumber) data.phoneNumber = String(phoneNumber).trim();
      return tx.staff.update({
        where: { id },
        data,
        include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true } } }
      });
    });

    res.json(updated);

    logActivity({ req, action: 'UPDATE', module: 'STAFF', description: `Updated staff ${updated.user.name} (${updated.department} - ${updated.designation})`, targetId: id, targetType: 'Staff' });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Server error updating staff entry' });
  }
};

module.exports = {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff
};
