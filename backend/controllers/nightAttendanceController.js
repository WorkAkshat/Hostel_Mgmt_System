const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

// @desc    Submit floor night attendance round (bulk)
// @route   POST /api/v1/attendance/night/bulk
// @access  Private (Admin / Warden)
const submitNightAttendance = async (req, res) => {
  try {
    const { date, floorNumber, records, notifyParents = false } = req.body;

    if (!floorNumber || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Please provide floorNumber and attendance records array.' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const fNum = parseInt(floorNumber, 10);
    const markedByUserId = req.user.id;

    const savedRecords = [];

    for (const record of records) {
      const { studentId, status } = record; // "PRESENT", "ABSENT", "ON_LEAVE"
      if (!studentId || !status) continue;

      const item = await prisma.nightAttendance.upsert({
        where: {
          studentId_date: {
            studentId,
            date: targetDate
          }
        },
        update: {
          status,
          floorNumber: fNum,
          markedByUserId,
          parentNotified: notifyParents
        },
        create: {
          studentId,
          date: targetDate,
          status,
          floorNumber: fNum,
          markedByUserId,
          parentNotified: notifyParents
        }
      });

      savedRecords.push(item);
    }

    res.status(201).json({
      message: `Night attendance recorded for Floor ${fNum} on ${targetDate}. Total students logged: ${savedRecords.length}`,
      date: targetDate,
      floorNumber: fNum,
      count: savedRecords.length
    });

    logActivity({ req, action: 'CREATE', module: 'ATTENDANCE', description: `Recorded night attendance for Floor ${fNum} on ${targetDate} (${savedRecords.length} students)`, metadata: { floorNumber: fNum, date: targetDate, count: savedRecords.length } });
  } catch (error) {
    console.error('Error recording night attendance:', error);
    res.status(500).json({ message: 'Server error saving night attendance round.' });
  }
};

// @desc    Get Train TT style floor night attendance sheet with room grouping & auto leave detection
// @route   GET /api/v1/attendance/night
// @access  Private
const getNightAttendance = async (req, res) => {
  try {
    const { date, floorNumber } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const reqFloor = parseInt(floorNumber || req.user?.assignedFloor || 1, 10);

    // 1. Fetch all rooms on this floor
    const rooms = await prisma.room.findMany({
      where: { floorNumber: reqFloor },
      include: {
        students: {
          include: {
            user: { select: { name: true, email: true } },
            leaveRequests: {
              where: { status: 'APPROVED' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { roomNumber: 'asc' }
    });

    // 2. Fetch existing night attendance logs for targetDate
    const existingLogs = await prisma.nightAttendance.findMany({
      where: { date: targetDate, floorNumber: reqFloor }
    });

    const logsMap = new Map();
    existingLogs.forEach(l => logsMap.set(l.studentId, l.status));

    const todayDateObj = new Date(targetDate);

    // 3. Build TT Chart Room-by-Room Structure
    let totalFloorStudents = 0;
    let presentCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;

    const roomsChart = rooms.map(room => {
      const roomStudents = room.students.map(student => {
        totalFloorStudents += 1;

        // Check active approved leave
        const activeLeave = student.leaveRequests.find(l => {
          const sDate = new Date(l.startDate);
          const eDate = new Date(l.endDate);
          return todayDateObj >= sDate && todayDateObj <= eDate;
        });

        // Determine status: existing log > active leave > default PRESENT
        let status = logsMap.get(student.id);
        let leaveInfo = null;

        if (activeLeave) {
          leaveInfo = {
            type: activeLeave.type,
            reason: activeLeave.reason,
            destination: activeLeave.destination,
            endDate: activeLeave.endDate?.toISOString()?.split('T')[0],
            expectedReturnTime: activeLeave.expectedReturnTime
          };
          if (!status) status = 'ON_LEAVE';
        }

        if (!status) status = 'PRESENT';

        if (status === 'PRESENT') presentCount += 1;
        else if (status === 'ABSENT') absentCount += 1;
        else if (status === 'ON_LEAVE') onLeaveCount += 1;

        return {
          id: student.id,
          name: student.user.name,
          rollNumber: student.rollNumber,
          phone: student.phoneNumber,
          parentContact: student.parentContact,
          status,
          hasActiveLeave: !!activeLeave,
          leaveInfo
        };
      });

      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        block: room.block,
        sharingType: room.sharingType,
        studentsCount: roomStudents.length,
        students: roomStudents
      };
    });

    res.json({
      date: targetDate,
      floorNumber: reqFloor,
      totalStudents: totalFloorStudents,
      presentCount,
      absentCount,
      onLeaveCount,
      roomsChart
    });
  } catch (error) {
    console.error('Error fetching night attendance sheet:', error);
    res.status(500).json({ message: 'Server error retrieving night attendance sheet.' });
  }
};

module.exports = {
  submitNightAttendance,
  getNightAttendance
};
