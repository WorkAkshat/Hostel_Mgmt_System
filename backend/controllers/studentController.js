const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../utils/activityLogger');

const prisma = new PrismaClient();

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin/Warden only)
const getAllStudents = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const cursor = req.query.cursor;

    const queryOptions = {
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        },
        room: true
      },
      orderBy: { id: 'asc' }
    };

    if (limit !== null) {
      queryOptions.take = limit + 1;
      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }
    }

    const students = await prisma.student.findMany(queryOptions);

    if (limit !== null) {
      let nextCursor = null;
      let hasMore = false;
      if (students.length > limit) {
        hasMore = true;
        nextCursor = students[limit - 1].id;
        students.pop();
      }
      return res.json({
        data: students,
        nextCursor,
        hasMore
      });
    }

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

  if (!name || !email || !password || !phoneNumber || !parentContact) {
    return res.status(400).json({ message: 'All fields except Room ID and Roll Number are required' });
  }

  try {
    // 1. Check if user already exists
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // 2. Check if roll number already exists
    let finalRoll = rollNumber;
    if (rollNumber) {
      const rollExists = await prisma.student.findUnique({ where: { rollNumber } });
      if (rollExists) {
        return res.status(400).json({ message: 'Student with this roll number already exists' });
      }
    } else {
      finalRoll = `ROLL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

      if (room.status === 'MAINTENANCE') {
        return res.status(400).json({ message: 'Selected room is under maintenance' });
      }
    }

    // 4. Create User and Student details in transaction
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
          rollNumber: finalRoll,
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

    logActivity({ req, action: 'CREATE', module: 'STUDENT', description: `Added student ${name} (${finalRoll})`, targetId: newStudent.id, targetType: 'Student' });
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
  const {
    name,
    phoneNumber,
    parentContact,
    roomId,
    status,
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
    const student = await prisma.student.findUnique({
      where: { id },
      include: { room: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
    }

    if (parentContact && !/^[0-9]{10}$/.test(parentContact)) {
      return res.status(400).json({ message: 'Parent contact number must be exactly 10 digits.' });
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
          roomId: targetRoomId,
          dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : student.dateOfJoining,
          maritalStatus: maritalStatus !== undefined ? maritalStatus : student.maritalStatus,
          fatherName: fatherName !== undefined ? fatherName : student.fatherName,
          dob: dob ? new Date(dob) : student.dob,
          permanentAddress: permanentAddress !== undefined ? permanentAddress : student.permanentAddress,
          state: state !== undefined ? state : student.state,
          pincode: pincode !== undefined ? pincode : student.pincode,
          coachingCollege: coachingCollege !== undefined ? coachingCollege : student.coachingCollege
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

    logActivity({ req, action: 'UPDATE', module: 'STUDENT', description: `Updated student ${updatedStudent.user.name} (${updatedStudent.rollNumber})`, targetId: id, targetType: 'Student' });
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

    logActivity({ req, action: 'DELETE', module: 'STUDENT', description: `Deleted student ${student.rollNumber}`, targetId: id, targetType: 'Student' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Server error deleting student' });
  }
};



const fs = require('fs');
const path = require('path');

const PROFILE_REQS_PATH = path.join(__dirname, '../profile_requests.json');
const DOCUMENTS_PATH = path.join(__dirname, '../student_documents.json');

const loadFile = (filePath, defaultVal = []) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
      return defaultVal;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading file ${filePath}:`, error);
    return defaultVal;
  }
};

const saveFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving file ${filePath}:`, error);
  }
};

const createProfileRequest = async (req, res) => {
  const { phoneNumber, fatherName, parentContact, permanentAddress, state, pincode, coachingCollege } = req.body;

  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const requests = loadFile(PROFILE_REQS_PATH);
    const newReq = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: student.id,
      studentName: student.user.name,
      studentRoll: student.rollNumber,
      requestedChanges: {
        phoneNumber,
        fatherName,
        parentContact,
        permanentAddress,
        state,
        pincode,
        coachingCollege
      },
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    requests.push(newReq);
    saveFile(PROFILE_REQS_PATH, requests);

    res.status(201).json(newReq);
  } catch (error) {
    console.error('Error creating profile request:', error);
    res.status(500).json({ message: 'Server error saving profile edit request' });
  }
};

const getPendingProfileRequests = async (req, res) => {
  try {
    const requests = loadFile(PROFILE_REQS_PATH);
    const pending = requests.filter(r => r.status === 'PENDING');
    res.json(pending);
  } catch (error) {
    console.error('Error fetching profile requests:', error);
    res.status(500).json({ message: 'Server error fetching profile requests' });
  }
};

const approveProfileRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const requests = loadFile(PROFILE_REQS_PATH);
    const reqIndex = requests.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ message: 'Profile request not found' });
    }

    const profileReq = requests[reqIndex];
    if (profileReq.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    const { phoneNumber, fatherName, parentContact, permanentAddress, state, pincode, coachingCollege } = profileReq.requestedChanges;

    await prisma.student.update({
      where: { id: profileReq.studentId },
      data: {
        phoneNumber: phoneNumber || undefined,
        fatherName: fatherName || undefined,
        parentContact: parentContact || undefined,
        permanentAddress: permanentAddress || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        coachingCollege: coachingCollege || undefined
      }
    });

    profileReq.status = 'APPROVED';
    requests[reqIndex] = profileReq;
    saveFile(PROFILE_REQS_PATH, requests);

    res.json({ message: 'Profile request approved and applied successfully', request: profileReq });
  } catch (error) {
    console.error('Error approving profile request:', error);
    res.status(500).json({ message: 'Server error approving profile request' });
  }
};

const rejectProfileRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const requests = loadFile(PROFILE_REQS_PATH);
    const reqIndex = requests.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ message: 'Profile request not found' });
    }

    const profileReq = requests[reqIndex];
    profileReq.status = 'REJECTED';
    requests[reqIndex] = profileReq;
    saveFile(PROFILE_REQS_PATH, requests);

    res.json({ message: 'Profile request rejected successfully', request: profileReq });
  } catch (error) {
    console.error('Error rejecting profile request:', error);
    res.status(500).json({ message: 'Server error rejecting request' });
  }
};

const uploadDocument = async (req, res) => {
  const { docType, documentNumber } = req.body;

  if (!docType || !documentNumber) {
    return res.status(400).json({ message: 'Document type and number are required' });
  }

  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const docs = loadFile(DOCUMENTS_PATH);
    const filteredDocs = docs.filter(d => !(d.studentId === student.id && d.docType === docType));

    const newDoc = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: student.id,
      docType,
      documentNumber,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    filteredDocs.push(newDoc);
    saveFile(DOCUMENTS_PATH, filteredDocs);

    res.status(201).json(newDoc);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Server error uploading ID document' });
  }
};

const verifyDocument = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'Valid verification status is required' });
  }

  try {
    const docs = loadFile(DOCUMENTS_PATH);
    const docIndex = docs.findIndex(d => d.id === id);

    if (docIndex === -1) {
      return res.status(404).json({ message: 'Document record not found' });
    }

    docs[docIndex].status = status;
    saveFile(DOCUMENTS_PATH, docs);

    res.json({ message: `Document verification marked as ${status}`, document: docs[docIndex] });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ message: 'Server error verifying ID document' });
  }
};

const getStudentDocuments = async (req, res) => {
  const { studentId } = req.params;

  try {
    const docs = loadFile(DOCUMENTS_PATH);
    const studentDocs = docs.filter(d => d.studentId === studentId);
    res.json(studentDocs);
  } catch (error) {
    console.error('Error fetching student documents:', error);
    res.status(500).json({ message: 'Server error retrieving ID documents' });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  createProfileRequest,
  getPendingProfileRequests,
  approveProfileRequest,
  rejectProfileRequest,
  uploadDocument,
  verifyDocument,
  getStudentDocuments
};
