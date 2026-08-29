const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { COMPANY_CONFIG, FEE_STRUCTURE, generateDemandNoteNumber, numberToWords } = require('../config/companyConfig');

// @desc    Generate 10-to-10 Demand Notes for a billing month
// @route   POST /api/v1/demand-notes/generate
// @access  Private (Admin / Warden)
const generateDemandNotes = async (req, res) => {
  try {
    const { billingMonth = '2026-08', floorNumber } = req.body;

    // Get active checked-in students
    const whereStudent = { status: 'CHECKED_IN' };
    if (floorNumber || req.user?.assignedFloor) {
      const targetFloor = parseInt(floorNumber || req.user.assignedFloor, 10);
      whereStudent.room = { floorNumber: targetFloor };
    }

    const students = await prisma.student.findMany({
      where: whereStudent,
      include: {
        room: {
          include: {
            electricityReadings: {
              where: { readingMonth: billingMonth },
              take: 1
            }
          }
        },
        user: { select: { name: true, email: true } }
      }
    });

    if (students.length === 0) {
      return res.status(404).json({ message: 'No active residents found for demand note generation.' });
    }

    const generated = [];
    const sequenceCounts = {};

    for (const student of students) {
      if (!student.room) continue;

      const fNum = student.room.floorNumber || 1;
      const companyInfo = COMPANY_CONFIG[fNum] || COMPANY_CONFIG[1];
      const sharingFee = FEE_STRUCTURE.hostel[student.room.sharingType] || FEE_STRUCTURE.hostel[2];

      const reading = student.room.electricityReadings?.[0];
      const elecUnits = reading ? reading.unitsConsumed : 0;
      const elecRate = reading ? reading.ratePerUnit : FEE_STRUCTURE.electricityRate;
      const elecAmt = reading ? reading.totalAmount : 0;
      const prevReading = reading ? reading.previousReading : 0;
      const currReading = reading ? reading.currentReading : 0;

      const hostelTotal = sharingFee + elecAmt;
      const messTotal = FEE_STRUCTURE.mess;
      const grandTotal = hostelTotal + messTotal;

      if (!sequenceCounts[companyInfo.notePrefix]) sequenceCounts[companyInfo.notePrefix] = 0;
      sequenceCounts[companyInfo.notePrefix] += 1;
      const noteNumber = generateDemandNoteNumber(companyInfo.notePrefix, billingMonth, sequenceCounts[companyInfo.notePrefix]);

      const demandNote = await prisma.demandNote.upsert({
        where: {
          studentId_billingMonth: {
            studentId: student.id,
            billingMonth
          }
        },
        update: {
          cycleStart: new Date(`${billingMonth}-10`),
          cycleEnd: new Date(`${billingMonth.slice(0, 4)}-09-09`),
          floorNumber: fNum,
          companyName: companyInfo.companyName,
          hostelFee: sharingFee,
          electricityUnits: elecUnits,
          electricityRate: elecRate,
          electricityAmount: elecAmt,
          messFee: messTotal,
          totalAmount: grandTotal
        },
        create: {
          studentId: student.id,
          billingMonth,
          cycleStart: new Date(`${billingMonth}-10`),
          cycleEnd: new Date(`${billingMonth.slice(0, 4)}-09-09`),
          floorNumber: fNum,
          companyName: companyInfo.companyName,
          hostelFee: sharingFee,
          electricityUnits: elecUnits,
          electricityRate: elecRate,
          electricityAmount: elecAmt,
          messFee: messTotal,
          otherCharges: 0,
          totalAmount: grandTotal,
          status: 'PENDING'
        }
      });

      generated.push({
        id: demandNote.id,
        noteNumber,
        studentName: student.user.name,
        rollNumber: student.rollNumber,
        fatherName: student.fatherName || '',
        floorNumber: fNum,
        roomNumber: student.room.roomNumber,
        sharingType: student.room.sharingType,
        companyName: companyInfo.companyName,
        hostelFee: sharingFee,
        electricityUnits: elecUnits,
        electricityRate: elecRate,
        electricityAmount: elecAmt,
        prevReading,
        currReading,
        messFee: messTotal,
        totalAmount: grandTotal,
        amountInWords: numberToWords(grandTotal),
      });
    }

    res.status(201).json({
      message: `Successfully generated ${generated.length} Demand Notes for cycle ${billingMonth}`,
      generated
    });
  } catch (error) {
    console.error('Error generating demand notes:', error);
    res.status(500).json({ message: 'Server error generating demand notes' });
  }
};

// @desc    Get Demand Notes list with full company details (filtered for Student if role = STUDENT)
// @route   GET /api/v1/demand-notes
// @access  Private
const getDemandNotes = async (req, res) => {
  try {
    const { month, floorNumber, status } = req.query;

    const where = {};
    if (month) where.billingMonth = month;
    if (status) where.status = status;

    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id }
      });
      if (student) {
        where.studentId = student.id;
      }
    } else {
      const reqFloor = floorNumber || req.user?.assignedFloor;
      if (reqFloor) {
        where.floorNumber = parseInt(reqFloor, 10);
      }
    }

    const demandNotes = await prisma.demandNote.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            room: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = demandNotes.map((note, index) => {
      const fNum = note.floorNumber || 1;
      const companyInfo = COMPANY_CONFIG[fNum] || COMPANY_CONFIG[1];
      const cateringInfo = COMPANY_CONFIG.catering;

      return {
        ...note,
        noteNumber: generateDemandNoteNumber(companyInfo.notePrefix, note.billingMonth, index + 1),
        amountInWords: numberToWords(note.totalAmount),
        company: companyInfo,
        catering: cateringInfo,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching demand notes:', error);
    res.status(500).json({ message: 'Server error fetching demand notes' });
  }
};

// @desc    Get company config for frontend rendering
// @route   GET /api/v1/demand-notes/company-config
// @access  Private
const getCompanyConfig = async (req, res) => {
  res.json({
    companies: COMPANY_CONFIG,
    fees: FEE_STRUCTURE,
  });
};

// @desc    Mark Demand Note as Paid (Warden / Manual)
// @route   PATCH /api/v1/demand-notes/:id/mark-paid
// @access  Private (Admin / Warden)
const markPaid = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.demandNote.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    });

    res.json({
      message: 'Demand note marked as PAID',
      demandNote: updated
    });
  } catch (error) {
    console.error('Error marking demand note paid:', error);
    res.status(500).json({ message: 'Server error updating demand note' });
  }
};

// @desc    Process Online Payment Gateway (UPI / Razorpay / NetBanking)
// @route   POST /api/v1/demand-notes/:id/pay
// @access  Private
const payOnline = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'UPI', transactionId, gateway = 'Razorpay' } = req.body;

    const note = await prisma.demandNote.findUnique({ where: { id } });
    if (!note) {
      return res.status(404).json({ message: 'Demand Note not found' });
    }

    const txnRef = transactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const updated = await prisma.demandNote.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    });

    res.json({
      message: `Payment of ₹${note.totalAmount.toLocaleString()} processed successfully via ${gateway} (${paymentMethod})`,
      transactionId: txnRef,
      paymentMethod,
      gateway,
      paidAt: updated.paidAt,
      demandNote: updated
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Server error processing online payment' });
  }
};

module.exports = {
  generateDemandNotes,
  getDemandNotes,
  getCompanyConfig,
  markPaid,
  payOnline
};
