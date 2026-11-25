const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');
const { COMPANY_CONFIG, FEE_STRUCTURE, generateDemandNoteNumber, numberToWords } = require('../config/companyConfig');

const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK', 'CHEQUE', 'ADVANCE'];

// Current billing month as YYYY-MM based on 10-to-10 cycle:
// If today is before the 10th, the active cycle is from the 10th of the previous month.
const currentMonth = () => {
  const d = new Date();
  if (d.getDate() < 10) {
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 15);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// A billing cycle runs from the 10th of the month to the 10th of the next month (10-to-10)
const billingCycle = (billingMonth) => {
  const [y, m] = billingMonth.split('-').map(Number);
  return { cycleStart: new Date(y, m - 1, 10), cycleEnd: new Date(y, m, 10) };
};

// @desc    Generate 10-to-10 Demand Notes for a billing month
// @route   POST /api/v1/demand-notes/generate
// @access  Private (Admin / Warden)
const generateDemandNotes = async (req, res) => {
  try {
    const { billingMonth = currentMonth(), floorNumber } = req.body;

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(billingMonth)) {
      return res.status(400).json({ message: 'Billing month must look like YYYY-MM.' });
    }
    const { cycleStart, cycleEnd } = billingCycle(billingMonth);

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
            },
            _count: { select: { students: { where: { status: 'CHECKED_IN' } } } }
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

    const totalCycleDays = Math.max(1, Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));

    for (const student of students) {
      if (!student.room) continue;

      const fNum = student.room.floorNumber || 1;
      const companyInfo = COMPANY_CONFIG[fNum] || COMPANY_CONFIG[1];
      const baseSharingFee = FEE_STRUCTURE.hostel[student.room.sharingType] || FEE_STRUCTURE.hostel[2];
      const baseMessFee = FEE_STRUCTURE.mess;

      // 10-to-10 month proration for residents joining mid-cycle
      const joinDate = student.dateOfJoining ? new Date(student.dateOfJoining) : (student.roomAssignedAt ? new Date(student.roomAssignedAt) : null);
      let sharingFee = baseSharingFee;
      let messTotal = baseMessFee;
      let isProrated = false;
      let daysActive = totalCycleDays;

      if (joinDate && joinDate > cycleStart && joinDate < cycleEnd) {
        daysActive = Math.max(1, Math.round((cycleEnd.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (daysActive < totalCycleDays) {
          sharingFee = Math.round((baseSharingFee / totalCycleDays) * daysActive);
          messTotal = Math.round((baseMessFee / totalCycleDays) * daysActive);
          isProrated = true;
        }
      }

      const reading = student.room.electricityReadings?.[0];
      // The room meter bill is split by the reading's configured splitCount (1, 2, or 3), or defaults to checked-in residents count
      const sharers = Math.max(1, parseInt(reading?.splitCount, 10) || student.room._count?.students || 1);
      const elecUnits = reading ? Math.round((reading.unitsConsumed / sharers) * 100) / 100 : 0;
      const elecRate = reading ? reading.ratePerUnit : FEE_STRUCTURE.electricityRate;
      const elecAmt = reading ? Math.round(reading.totalAmount / sharers) : 0;
      const prevReading = reading ? reading.previousReading : 0;
      const currReading = reading ? reading.currentReading : 0;

      const hostelTotal = sharingFee + elecAmt;
      const grandTotal = hostelTotal + messTotal;

      if (!sequenceCounts[companyInfo.notePrefix]) sequenceCounts[companyInfo.notePrefix] = 0;
      sequenceCounts[companyInfo.notePrefix] += 1;
      const noteNumber = generateDemandNoteNumber(companyInfo.notePrefix, billingMonth, sequenceCounts[companyInfo.notePrefix]);

      // Notes that are already paid are left exactly as they were billed
      const existing = await prisma.demandNote.findUnique({
        where: { studentId_billingMonth: { studentId: student.id, billingMonth } },
        select: { status: true }
      });
      if (existing?.status === 'PAID') continue;

      const demandNote = await prisma.demandNote.upsert({
        where: {
          studentId_billingMonth: {
            studentId: student.id,
            billingMonth
          }
        },
        update: {
          cycleStart,
          cycleEnd,
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
          cycleStart,
          cycleEnd,
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

      // Get student's Security Deposit and Advance records
      const studentInvoices = await prisma.invoice.findMany({
        where: { studentId: student.id, status: 'PAID' },
        select: { category: true, title: true, amount: true }
      });
      const depositPaid = studentInvoices
        .filter((i) => i.category === 'DEPOSIT' || /security|deposit/i.test(i.title || ''))
        .reduce((sum, i) => sum + (i.amount || 0), 0);
      const advancePaid = studentInvoices
        .filter((i) => i.category === 'ADVANCE' || /advance/i.test(i.title || ''))
        .reduce((sum, i) => sum + (i.amount || 0), 0);

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
        baseHostelFee: baseSharingFee,
        electricityUnits: elecUnits,
        electricityRate: elecRate,
        electricityAmount: elecAmt,
        prevReading,
        currReading,
        messFee: messTotal,
        baseMessFee: baseMessFee,
        totalAmount: grandTotal,
        amountInWords: numberToWords(grandTotal),
        isProrated,
        daysActive,
        totalCycleDays,
        depositPaid,
        advancePaid,
      });
    }

    res.status(201).json({
      message: `Generated ${generated.length} Demand Notes for ${billingMonth}`,
      count: generated.length,
      demandNotes: generated
    });

    logActivity({ req, action: 'CREATE', module: 'FEE', description: `Generated ${generated.length} demand notes for ${billingMonth}`, metadata: { count: generated.length, billingMonth } });
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
      // Residents see a note once the warden has sent it (drafts stay with the office)
      if (!status) where.status = { in: ['SENT', 'PAID'] };
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

    // Stable note numbers: position within the note's month + floor, oldest first
    const groups = [...new Set(demandNotes.map((n) => `${n.billingMonth}|${n.floorNumber || 1}`))];
    const sequence = {};
    for (const key of groups) {
      const [billingMonth, floor] = key.split('|');
      const ids = await prisma.demandNote.findMany({
        where: { billingMonth, floorNumber: parseInt(floor, 10) },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true }
      });
      ids.forEach((row, i) => { sequence[row.id] = i + 1; });
    }

    // Fetch all paid invoices for students in these notes to get deposit & advance
    const studentIds = [...new Set(demandNotes.map((n) => n.studentId))];
    const studentInvoices = studentIds.length > 0 ? await prisma.invoice.findMany({
      where: { studentId: { in: studentIds }, status: 'PAID' },
      select: { studentId: true, category: true, title: true, amount: true }
    }) : [];

    const enriched = demandNotes.map((note) => {
      const fNum = note.floorNumber || 1;
      const companyInfo = COMPANY_CONFIG[fNum] || COMPANY_CONFIG[1];
      const cateringInfo = COMPANY_CONFIG.catering;

      const myInvoices = studentInvoices.filter((i) => i.studentId === note.studentId);
      const depositPaid = myInvoices
        .filter((i) => i.category === 'DEPOSIT' || /security|deposit/i.test(i.title || ''))
        .reduce((sum, i) => sum + (i.amount || 0), 0);
      const advancePaid = myInvoices
        .filter((i) => i.category === 'ADVANCE' || /advance/i.test(i.title || ''))
        .reduce((sum, i) => sum + (i.amount || 0), 0);

      return {
        ...note,
        noteNumber: generateDemandNoteNumber(companyInfo.notePrefix, note.billingMonth, sequence[note.id] || 1),
        amountInWords: numberToWords(note.totalAmount),
        company: companyInfo,
        catering: cateringInfo,
        depositPaid,
        advancePaid,
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

// @desc    Update electricity rate per unit
// @route   PUT /api/v1/demand-notes/electricity-rate
// @access  Private (Admin / Warden)
const updateElectricityRate = async (req, res) => {
  try {
    const { rate } = req.body;
    const r = parseFloat(rate);
    if (isNaN(r) || r < 0) {
      return res.status(400).json({ message: 'Rate per unit must be a valid number.' });
    }
    FEE_STRUCTURE.electricityRate = r;
    res.json({ message: `Electricity rate updated to ₹${r}/unit`, rate: r });
    logActivity({ req, action: 'UPDATE', module: 'FEE', description: `Updated electricity rate per unit to ₹${r}`, metadata: { rate: r } });
  } catch (error) {
    console.error('Error updating electricity rate:', error);
    res.status(500).json({ message: 'Server error updating electricity rate' });
  }
};

// @desc    Record a payment received against a Demand Note (Warden only)
// @route   PATCH /api/v1/demand-notes/:id/mark-paid  (also POST /:id/pay for older clients)
// @access  Private (Admin / Warden)
const markPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { method = 'CASH', reference = '', paidOn } = req.body || {};

    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ message: `Payment method must be one of ${PAYMENT_METHODS.join(', ')}` });
    }

    const note = await prisma.demandNote.findUnique({
      where: { id },
      include: { student: { include: { user: { select: { name: true } } } } }
    });
    if (!note) {
      return res.status(404).json({ message: 'Demand Note not found' });
    }
    if (note.status === 'PAID') {
      return res.status(400).json({ message: 'This demand note is already paid' });
    }

    const paidAt = paidOn ? new Date(paidOn) : new Date();
    if (Number.isNaN(paidAt.getTime()) || paidAt > new Date()) {
      return res.status(400).json({ message: 'Payment date cannot be in the future' });
    }

    const updated = await prisma.demandNote.update({
      where: { id },
      data: { status: 'PAID', paidAt }
    });

    res.json({
      message: 'Demand note marked as PAID',
      demandNote: updated
    });

    const ref = String(reference).trim();
    logActivity({
      req,
      action: 'PAYMENT',
      module: 'FEE',
      description: `Recorded ₹${note.totalAmount} from ${note.student.user.name} for ${note.billingMonth} via ${method}${ref ? ` (ref ${ref})` : ''}`,
      targetId: id,
      targetType: 'DemandNote',
      metadata: { method, reference: ref, paidAt }
    });
  } catch (error) {
    console.error('Error marking demand note paid:', error);
    res.status(500).json({ message: 'Server error updating demand note' });
  }
};

// @desc    Send demand notes to residents (draft → SENT). Either specific ids, or every
//          draft for a month (and floor). Paid notes are never touched.
// @route   POST /api/v1/demand-notes/send   body: { ids?: string[], month?: 'YYYY-MM', floorNumber? }
// @access  Private (Admin / Warden)
const sendDemandNotes = async (req, res) => {
  try {
    const { ids, month, floorNumber } = req.body || {};
    const where = { status: 'PENDING' };
    if (Array.isArray(ids) && ids.length) where.id = { in: ids.map(String) };
    else if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) where.billingMonth = month;
    else return res.status(400).json({ message: 'Choose the notes or the month to send' });
    const floor = req.user.assignedFloor || (floorNumber && floorNumber !== 'all' ? parseInt(floorNumber, 10) : null);
    if (floor) where.floorNumber = floor;

    const result = await prisma.demandNote.updateMany({ where, data: { status: 'SENT', sentAt: new Date() } });
    res.json({ message: result.count ? `Sent ${result.count} demand note${result.count === 1 ? '' : 's'} to residents` : 'Nothing new to send', count: result.count });
    if (result.count) {
      logActivity({ req, action: 'UPDATE', module: 'FEE', description: `Sent ${result.count} demand note(s) to residents${where.billingMonth ? ` for ${where.billingMonth}` : ''}${floor ? ` · floor ${floor}` : ''}`, metadata: { count: result.count, month: where.billingMonth, floor } });
    }
  } catch (error) {
    console.error('Error sending demand notes:', error);
    res.status(500).json({ message: 'Server error sending demand notes' });
  }
};

module.exports = {
  sendDemandNotes,
  generateDemandNotes,
  getDemandNotes,
  getCompanyConfig,
  updateElectricityRate,
  markPaid
};
