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
    const floors = await prisma.floor.findMany({ orderBy: { floorNumber: 'asc' } });
    // Match rooms by floorNumber so rooms missing a floorId are still counted
    const allRooms = await prisma.room.findMany({
      select: { floorNumber: true, status: true, sharingType: true, capacity: true, _count: { select: { students: true } } },
    });

    const result = floors.map((floor) => {
      const rooms         = allRooms.filter((r) => r.floorNumber === floor.floorNumber);
      const totalRooms    = rooms.length;
      const totalStudents = rooms.reduce((sum, r) => sum + r._count.students, 0);
      const totalBeds     = rooms.reduce((sum, r) => sum + (r.sharingType || r.capacity || 0), 0);
      const fullRooms     = rooms.filter((r) => r.status === 'FULL').length;
      const availableRooms= rooms.filter((r) => r.status === 'AVAILABLE').length;
      const maintenanceRooms = rooms.filter((r) => r.status === 'MAINTENANCE').length;

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
          totalBeds,
          freeBeds: Math.max(0, totalBeds - totalStudents),
          fullRooms,
          availableRooms,
          maintenanceRooms,
          occupancyPct: totalBeds > 0 ? Math.round((totalStudents / totalBeds) * 100) : 0,
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
              where: { kind: 'FEE' },
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
      capacity:    room.sharingType || room.capacity,
      monthlyFee:  FEE[room.sharingType] ?? FEE[2],
      students: room.students.map((s) => ({
        id:              s.id,
        name:            s.user.name,
        email:           s.user.email,
        rollNumber:      s.rollNumber,
        bedId:           s.bedId,
        avatar:          s.profilePic,
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
    const { syncAccountingReceipts } = require('./accountingController');
    await syncAccountingReceipts().catch(() => {});

    const floor = await prisma.floor.findUnique({ where: { floorNumber: floorNum } });
    if (!floor) return res.status(404).json({ message: `Floor ${floorNum} not found.` });

    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const rooms = await prisma.room.findMany({
      where: { floorNumber: floorNum },
      include: {
        students: {
          include: {
            user: { select: { name: true, email: true } },
            invoices: {
              where: {
                kind: 'FEE',
                createdAt: {
                  gte: monthStart,
                  lt: nextMonth,
                },
              },
              select: { id: true, amount: true, status: true, paidAt: true, rentAmount: true, messAmount: true, electricityAmount: true },
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
      const defaultRent = (FEE[room.sharingType] ?? FEE[2]) - MESS_FEE;
      const electricityPerRoom = room.electricityReadings.reduce((s, r) => s + r.totalAmount, 0);
      const electricityPerStudent = room.students.length > 0 ? electricityPerRoom / room.students.length : 0;

      for (const student of room.students) {
        totalStudents++;
        const latestInvoice = student.invoices[0] || null;

        let rentAmt = latestInvoice?.rentAmount != null ? latestInvoice.rentAmount : defaultRent;
        let messAmt = latestInvoice?.messAmount != null ? latestInvoice.messAmount : MESS_FEE;
        let elecAmt = latestInvoice?.electricityAmount != null ? latestInvoice.electricityAmount : electricityPerStudent;
        let studentTotal = latestInvoice ? latestInvoice.amount : (rentAmt + messAmt + elecAmt);

        const isPaid = latestInvoice?.status === 'PAID';
        const paidTotal = isPaid ? studentTotal : 0;
        const pendingTotal = isPaid ? 0 : studentTotal;

        totalHostelFee   += rentAmt;
        totalMessFee     += messAmt;
        totalElectricity += elecAmt;
        totalCollected   += paidTotal;
        totalPending     += pendingTotal;

        studentRows.push({
          id:           student.id,
          name:         student.user.name,
          email:        student.user.email,
          rollNumber:   student.rollNumber,
          roomNumber:   room.roomNumber,
          sharingType:  sharingLabel(room.sharingType),
          hostelFee:    Math.round(rentAmt),
          messFee:      Math.round(messAmt),
          electricity:  Math.round(elecAmt),
          total:        Math.round(studentTotal),
          paid:         Math.round(paidTotal),
          pending:      Math.round(pendingTotal),
          status:       latestInvoice ? latestInvoice.status : 'PENDING_INVOICE',
          invoiceId:    latestInvoice ? latestInvoice.id : null
        });
      }
    }

    res.json({
      floor: {
        floorNumber: floorNum,
        companyName: floor.companyName,
        hostelName: floor.hostelName,
        shortName: floor.shortName,
        floorLabel: floor.floorLabel
      },
      month,
      summary: {
        totalStudents,
        totalHostelFee:    Math.round(totalHostelFee),
        totalMessFee:      Math.round(totalMessFee),
        totalElectricity:  Math.round(totalElectricity),
        grandTotal:        Math.round(totalHostelFee + totalMessFee + totalElectricity),
        totalCollected:    Math.round(totalCollected),
        totalPending:      Math.round(totalPending),
        collectionRate:    (totalHostelFee + totalMessFee + totalElectricity) > 0
          ? Math.round((totalCollected / (totalHostelFee + totalMessFee + totalElectricity)) * 100)
          : 0,
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
    const { syncAccountingReceipts } = require('./accountingController');
    await syncAccountingReceipts().catch(() => {});

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

    // Meenakshi Catering summary (₹3,000 × all students or total mess fee)
    const meenakshiTotal = grandTotal.messFee || (grandTotal.totalStudents * MESS_FEE);

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
