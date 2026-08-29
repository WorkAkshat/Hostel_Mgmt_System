const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Fee constants (shared source of truth) ───────────────────────────────────
const FEE = {
  1: 16000, // Single sharing
  2: 14000, // Twin sharing
  3: 12000, // Triple sharing
};
const MESS_FEE = parseInt(process.env.MESS_FEE_PER_STUDENT, 10) || 3000;

// ─── Helper: map sharingType to label ────────────────────────────────────────
const sharingLabel = (n) => ({ 1: 'Single', 2: 'Twin', 3: 'Triple' }[n] || `${n}-sharing`);

// @desc    List all 5 floors with summary stats
// @route   GET /api/v1/floors
// @access  Private (Admin)
const getAllFloors = async (req, res) => {
  try {
    const floors = await prisma.floor.findMany({
      orderBy: { floorNumber: 'asc' },
      include: {
        rooms: {
          include: { students: true },
        },
      },
    });

    const result = floors.map((floor) => {
      const totalRooms    = floor.rooms.length;
      const totalStudents = floor.rooms.reduce((sum, r) => sum + r.students.length, 0);
      const fullRooms     = floor.rooms.filter((r) => r.status === 'FULL').length;
      const availableRooms= floor.rooms.filter((r) => r.status === 'AVAILABLE').length;

      return {
        id:           floor.id,
        floorNumber:  floor.floorNumber,
        companyName:  floor.companyName,
        hostelName:   floor.hostelName,
        shortName:    floor.shortName,
        floorLabel:   floor.floorLabel,
        stats: {
          totalRooms,
          totalStudents,
          fullRooms,
          availableRooms,
          occupancyPct: totalRooms > 0 ? Math.round((totalStudents / (totalRooms * 3)) * 100) : 0,
        },
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching floors:', error);
    res.status(500).json({ message: 'Server error fetching floors.' });
  }
};

// @desc    Get rooms + students for a specific floor, grouped by room
// @route   GET /api/v1/floors/:floorNumber/students
// @access  Private (Admin)
const getFloorStudents = async (req, res) => {
  const floorNum = parseInt(req.params.floorNumber, 10);

  try {
    const floor = await prisma.floor.findUnique({
      where: { floorNumber: floorNum },
    });

    if (!floor) {
      return res.status(404).json({ message: `Floor ${floorNum} not found.` });
    }

    const rooms = await prisma.room.findMany({
      where: { floorNumber: floorNum },
      orderBy: { roomNumber: 'asc' },
      include: {
        students: {
          include: {
            user: { select: { name: true, email: true } },
            invoices: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { amount: true, status: true, dueDate: true },
            },
          },
        },
      },
    });

    const roomData = rooms.map((room) => ({
      id:          room.id,
      roomNumber:  room.roomNumber,
      block:       room.block,
      sharingType: room.sharingType,
      sharingLabel: sharingLabel(room.sharingType),
      isAc:        room.isAc,
      status:      room.status,
      occupancy:   room.students.length,
      capacity:    room.sharingType,
      monthlyFee:  FEE[room.sharingType] ?? FEE[2],
      students: room.students.map((s) => ({
        id:              s.id,
        name:            s.user.name,
        email:           s.user.email,
        rollNumber:      s.rollNumber,
        phoneNumber:     s.phoneNumber,
        parentContact:   s.parentContact,
        status:          s.status,
        fatherName:      s.fatherName,
        coachingCollege: s.coachingCollege,
        dateOfJoining:   s.dateOfJoining,
        latestInvoice:   s.invoices[0] ?? null,
      })),
    }));

    res.json({
      floor: {
        id:          floor.id,
        floorNumber: floor.floorNumber,
        companyName: floor.companyName,
        hostelName:  floor.hostelName,
        shortName:   floor.shortName,
        floorLabel:  floor.floorLabel,
      },
      rooms: roomData,
      summary: {
        totalRooms:    rooms.length,
        totalStudents: rooms.reduce((s, r) => s + r.students.length, 0),
        messFeeTotal:  rooms.reduce((s, r) => s + r.students.length, 0) * MESS_FEE,
      },
    });
  } catch (error) {
    console.error('Error fetching floor students:', error);
    res.status(500).json({ message: 'Server error fetching floor directory.' });
  }
};

// @desc    Financial summary for one floor (for a given month YYYY-MM)
// @route   GET /api/v1/floors/:floorNumber/report?month=YYYY-MM
// @access  Private (Admin)
const getFloorReport = async (req, res) => {
  const floorNum = parseInt(req.params.floorNumber, 10);
  const month    = req.query.month || new Date().toISOString().slice(0, 7); // "YYYY-MM"

  try {
    const floor = await prisma.floor.findUnique({ where: { floorNumber: floorNum } });
    if (!floor) return res.status(404).json({ message: `Floor ${floorNum} not found.` });

    const rooms = await prisma.room.findMany({
      where: { floorNumber: floorNum },
      include: {
        students: {
          include: {
            user: { select: { name: true } },
            invoices: {
              where: {
                createdAt: {
                  gte: new Date(`${month}-01`),
                  lt:  new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
                },
              },
              select: { amount: true, status: true, paidAt: true },
            },
          },
        },
        electricityReadings: {
          where: { readingMonth: month },
          select: { unitsConsumed: true, totalAmount: true },
        },
      },
    });

    let totalHostelFee    = 0;
    let totalMessFee      = 0;
    let totalElectricity  = 0;
    let totalCollected    = 0;
    let totalPending      = 0;
    let totalStudents     = 0;
    const studentRows     = [];

    for (const room of rooms) {
      const hostelFeePerStudent = FEE[room.sharingType] ?? FEE[2];
      const electricityPerRoom  = room.electricityReadings.reduce((s, r) => s + r.totalAmount, 0);
      const electricityPerStudent = room.students.length > 0 ? electricityPerRoom / room.students.length : 0;

      for (const student of room.students) {
        totalStudents++;
        const invoiceTotal   = student.invoices.reduce((s, i) => s + i.amount, 0);
        const paidTotal      = student.invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
        const pendingTotal   = invoiceTotal - paidTotal;

        totalHostelFee   += hostelFeePerStudent;
        totalMessFee     += MESS_FEE;
        totalElectricity += electricityPerStudent;
        totalCollected   += paidTotal;
        totalPending     += pendingTotal;

        studentRows.push({
          name:         student.user.name,
          roomNumber:   room.roomNumber,
          sharingType:  sharingLabel(room.sharingType),
          hostelFee:    hostelFeePerStudent,
          messFee:      MESS_FEE,
          electricity:  Math.round(electricityPerStudent),
          total:        hostelFeePerStudent + MESS_FEE + Math.round(electricityPerStudent),
          paid:         Math.round(paidTotal),
          pending:      Math.round(pendingTotal),
        });
      }
    }

    res.json({
      floor:       { floorNumber: floorNum, companyName: floor.companyName, hostelName: floor.hostelName },
      month,
      summary: {
        totalStudents,
        totalHostelFee,
        totalMessFee,
        totalElectricity:  Math.round(totalElectricity),
        grandTotal:        Math.round(totalHostelFee + totalMessFee + totalElectricity),
        totalCollected:    Math.round(totalCollected),
        totalPending:      Math.round(totalPending),
        collectionRate:    totalStudents > 0 ? Math.round((totalCollected / (totalHostelFee + totalMessFee)) * 100) : 0,
      },
      students: studentRows,
    });
  } catch (error) {
    console.error('Error generating floor report:', error);
    res.status(500).json({ message: 'Server error generating floor report.' });
  }
};

// @desc    Consolidated financial report across ALL floors
// @route   GET /api/v1/floors/consolidated/report?month=YYYY-MM
// @access  Private (Admin)
const getConsolidatedReport = async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  try {
    const floors = await prisma.floor.findMany({ orderBy: { floorNumber: 'asc' } });
    const floorReports = [];
    let grandTotal = { totalStudents: 0, hostelFee: 0, messFee: 0, electricity: 0, total: 0, collected: 0, pending: 0 };

    for (const floor of floors) {
      // Reuse the floor report logic
      const mockReq = { params: { floorNumber: floor.floorNumber.toString() }, query: { month } };
      let captured;
      const mockRes = {
        json: (data) => { captured = data; },
        status: () => ({ json: () => {} }),
      };
      await getFloorReport(mockReq, mockRes);

      if (captured) {
        floorReports.push(captured);
        grandTotal.totalStudents += captured.summary.totalStudents;
        grandTotal.hostelFee     += captured.summary.totalHostelFee;
        grandTotal.messFee       += captured.summary.totalMessFee;
        grandTotal.electricity   += captured.summary.totalElectricity;
        grandTotal.total         += captured.summary.grandTotal;
        grandTotal.collected     += captured.summary.totalCollected;
        grandTotal.pending       += captured.summary.totalPending;
      }
    }

    // Meenakshi Catering summary (₹3,000 × all students)
    const meenakshiTotal = grandTotal.totalStudents * MESS_FEE;

    res.json({
      month,
      floors: floorReports,
      grandTotal: {
        ...grandTotal,
        meenakshiCatering: meenakshiTotal,
        collectionRate: grandTotal.total > 0 ? Math.round((grandTotal.collected / grandTotal.total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Error generating consolidated report:', error);
    res.status(500).json({ message: 'Server error generating consolidated report.' });
  }
};

module.exports = {
  getAllFloors,
  getFloorStudents,
  getFloorReport,
  getConsolidatedReport,
  FEE,
  MESS_FEE,
};
