const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin/Warden only)
const getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        },
        room: true
      }
    });
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error fetching students' });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private
const getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        room: true,
        complaints: true,
        leaveRequests: true,
        invoices: true,
        visitors: true
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Secure checking: Students can only view their own details, Admin can view all
    if (req.user.role !== 'ADMIN' && req.user.id !== student.userId) {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Server error fetching student' });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Admin/Warden only)
const createStudent = async (req, res) => {
  const { name, email, password, rollNumber, phoneNumber, parentContact, roomId } = req.body;

  if (!name || !email || !password || !rollNumber || !phoneNumber || !parentContact) {
    return res.status(400).json({ message: 'All fields except Room ID are required' });
  }

  try {
    // 1. Check if user already exists
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // 2. Check if roll number already exists
    const rollExists = await prisma.student.findUnique({ where: { rollNumber } });
    if (rollExists) {
      return res.status(400).json({ message: 'Student with this roll number already exists' });
    }

    // 3. Optional Room capacity check
    if (roomId) {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { students: true }
      });

      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      if (room.students.length >= room.sharingType) {
        return res.status(400).json({ message: 'Selected room is already full' });
      }
    }

    // 4. Create User and Student details in a transaction
    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'STUDENT',
        }
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          rollNumber,
          phoneNumber,
          parentContact,
          roomId: roomId || null,
          status: 'CHECKED_IN'
        },
        include: {
          room: true
        }
      });

      // Update room status to FULL if occupancy reaches sharing limit
      if (roomId) {
        const updatedRoom = await tx.room.findUnique({
          where: { id: roomId },
          include: { students: true }
        });
        if (updatedRoom.students.length >= updatedRoom.sharingType) {
          await tx.room.update({
            where: { id: roomId },
            data: { status: 'FULL' }
          });
        }
      }

      return student;
    });

    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Server error creating student' });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin/Warden only)
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, phoneNumber, parentContact, roomId, status } = req.body;

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { room: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const updatedStudent = await prisma.$transaction(async (tx) => {
      // 1. Update user details if name is changed
      if (name) {
        await tx.user.update({
          where: { id: student.userId },
          data: { name }
        });
      }

      // 2. Check and handle Room change
      let targetRoomId = student.roomId;
      if (roomId !== undefined && roomId !== student.roomId) {
        // If student is leaving an old room, update that old room status to AVAILABLE
        if (student.roomId) {
          await tx.room.update({
            where: { id: student.roomId },
            data: { status: 'AVAILABLE' }
          });
        }

        // If assigning to a new room, check room capacity
        if (roomId) {
          const newRoom = await tx.room.findUnique({
            where: { id: roomId },
            include: { students: true }
          });

          if (!newRoom) {
            throw new Error('Target room not found');
          }

          const currentOccupancyCount = newRoom.students.filter(s => s.id !== student.id).length;
          if (currentOccupancyCount >= newRoom.sharingType) {
            throw new Error('Target room is full');
          }

          targetRoomId = roomId;

          // Update room to FULL if target room is now filled
          if (currentOccupancyCount + 1 >= newRoom.sharingType) {
            await tx.room.update({
              where: { id: roomId },
              data: { status: 'FULL' }
            });
          }
        } else {
          targetRoomId = null;
        }
      }

      // 3. Update student details
      return await tx.student.update({
        where: { id },
        data: {
          phoneNumber: phoneNumber || student.phoneNumber,
          parentContact: parentContact || student.parentContact,
          status: status || student.status,
          roomId: targetRoomId
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          room: true
        }
      });
    });

    res.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: error.message || 'Server error updating student' });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin/Warden only)
const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await prisma.student.findUnique({ where: { id } });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated user (cascades student records, leaveRequests, complaints, invoices, visitors in schema)
      await tx.user.delete({
        where: { id: student.userId }
      });

      // 2. Update room status to AVAILABLE if student was allocated to a room
      if (student.roomId) {
        await tx.room.update({
          where: { id: student.roomId },
          data: { status: 'AVAILABLE' }
        });
      }
    });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Server error deleting student' });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};
