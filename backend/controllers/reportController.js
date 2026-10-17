const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MEALS = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
const DAY = 86400000;

// "YYYY-MM" → [first day 00:00, first day of next month 00:00)
const monthRange = (month) => {
  const [y, m] = month.split('-').map(Number);
  return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1), days: new Date(y, m, 0).getDate(), y, m };
};

const tally = (list, key) => list.reduce((acc, item) => {
  const k = typeof key === 'function' ? key(item) : item[key];
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});

// @desc    One-month operational summary for the Reports section
// @route   GET /api/v1/reports/summary?month=YYYY-MM&floorNumber=
// @access  Private (Admin)
const getSummary = async (req, res) => {
  const now = new Date();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month || '')
    ? req.query.month
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const floorParam = req.user?.assignedFloor || (req.query.floorNumber && req.query.floorNumber !== 'all' ? req.query.floorNumber : null);
  const floorNumber = floorParam ? parseInt(floorParam, 10) : null;
  const { from, to, days, y, m } = monthRange(month);

  // Records belong to a floor through the student's room
  const studentScope = floorNumber ? { student: { room: { floorNumber } } } : {};
  const inMonth = (field) => ({ [field]: { gte: from, lt: to } });

  try {
    const [floors, rooms, students, leaves, complaints, visitors, attendance, optOuts] = await Promise.all([
      prisma.floor.findMany({ orderBy: { floorNumber: 'asc' } }),
      prisma.room.findMany({
        where: floorNumber ? { floorNumber } : {},
        select: { id: true, floorNumber: true, sharingType: true, capacity: true, status: true, students: { select: { id: true, status: true } } },
      }),
      prisma.student.findMany({
        where: { user: { role: 'STUDENT' }, ...(floorNumber ? { room: { floorNumber } } : {}) },
        select: { id: true, status: true, roomId: true, dateOfJoining: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          ...studentScope,
          OR: [inMonth('startDate'), inMonth('createdAt'), { status: 'CHECKED_OUT' }],
        },
        select: {
          id: true, type: true, status: true, startDate: true, endDate: true, checkoutTime: true, checkinTime: true, createdAt: true,
          student: { select: { id: true, rollNumber: true, user: { select: { name: true } }, room: { select: { roomNumber: true } } } },
        },
      }),
      prisma.complaint.findMany({
        where: { ...studentScope, OR: [inMonth('createdAt'), { status: { not: 'RESOLVED' } }] },
        select: { id: true, category: true, priority: true, status: true, createdAt: true },
      }),
      prisma.visitor.findMany({
        where: { ...studentScope, ...inMonth('checkInTime') },
        select: { id: true, relationship: true, checkInTime: true, checkOutTime: true },
      }),
      prisma.messAttendance.findMany({
        where: { ...studentScope, date: { gte: `${month}-01`, lte: `${month}-31` } },
        select: { date: true, mealType: true },
      }),
      prisma.mealOptOut.findMany({
        where: { ...studentScope, date: { gte: `${month}-01`, lte: `${month}-31` } },
        select: { date: true, mealType: true },
      }),
    ]);

    // ── Occupancy ──
    const beds = (r) => r.sharingType || r.capacity || 0;
    const floorRows = floors
      .filter((f) => !floorNumber || f.floorNumber === floorNumber)
      .map((f) => {
        const fr = rooms.filter((r) => r.floorNumber === f.floorNumber);
        const total = fr.reduce((s, r) => s + beds(r), 0);
        const occupied = fr.reduce((s, r) => s + r.students.length, 0);
        const blocked = fr.filter((r) => r.status === 'MAINTENANCE').reduce((s, r) => s + Math.max(0, beds(r) - r.students.length), 0);
        return {
          floorNumber: f.floorNumber,
          companyName: f.companyName,
          hostelName: f.hostelName,
          rooms: fr.length,
          beds: total,
          occupied,
          free: Math.max(0, total - occupied - blocked),
          maintenanceRooms: fr.filter((r) => r.status === 'MAINTENANCE').length,
          bySharing: tally(fr, (r) => beds(r)),
        };
      });
    const occTotals = floorRows.reduce((acc, f) => ({
      rooms: acc.rooms + f.rooms, beds: acc.beds + f.beds, occupied: acc.occupied + f.occupied, free: acc.free + f.free, maintenanceRooms: acc.maintenanceRooms + f.maintenanceRooms,
    }), { rooms: 0, beds: 0, occupied: 0, free: 0, maintenanceRooms: 0 });

    // ── Leaves ──
    const monthLeaves = leaves.filter((l) => (l.startDate >= from && l.startDate < to) || (l.createdAt >= from && l.createdAt < to));
    const lateReturns = monthLeaves.filter((l) => l.checkinTime && l.endDate && l.checkinTime > l.endDate);
    const overdueNow = leaves.filter((l) => l.status === 'CHECKED_OUT' && l.endDate && l.endDate < now);
    const perStudent = {};
    monthLeaves.forEach((l) => {
      const k = l.student?.id;
      if (!k) return;
      perStudent[k] = perStudent[k] || { name: l.student.user?.name, rollNumber: l.student.rollNumber, roomNumber: l.student.room?.roomNumber, count: 0, nights: 0 };
      perStudent[k].count += 1;
      perStudent[k].nights += Math.max(1, Math.round((new Date(l.endDate) - new Date(l.startDate)) / DAY));
    });
    const leaveDaily = Array.from({ length: days }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, '0')}`, count: 0 }));
    monthLeaves.forEach((l) => {
      const d = new Date(l.startDate);
      if (d >= from && d < to) leaveDaily[d.getDate() - 1].count += 1;
    });

    // ── Visitors ──
    const stays = visitors.filter((v) => v.checkOutTime).map((v) => (new Date(v.checkOutTime) - new Date(v.checkInTime)) / 60000);
    const visitorDaily = Array.from({ length: days }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, '0')}`, count: 0 }));
    visitors.forEach((v) => { visitorDaily[new Date(v.checkInTime).getDate() - 1].count += 1; });

    // ── Complaints ──
    const monthComplaints = complaints.filter((c) => c.createdAt >= from && c.createdAt < to);
    const openAll = complaints.filter((c) => c.status !== 'RESOLVED');
    const categories = {};
    monthComplaints.forEach((c) => {
      categories[c.category] = categories[c.category] || { category: c.category, count: 0, open: 0 };
      categories[c.category].count += 1;
      if (c.status !== 'RESOLVED') categories[c.category].open += 1;
    });

    // ── Mess ──
    const messDays = Array.from({ length: days }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, '0')}`;
      return { date, ...Object.fromEntries(MEALS.map((meal) => [meal, 0])), optOuts: 0 };
    });
    const dayIndex = (date) => parseInt(String(date).slice(8, 10), 10) - 1;
    attendance.forEach((a) => { const d = messDays[dayIndex(a.date)]; if (d && d[a.mealType] !== undefined) d[a.mealType] += 1; });
    optOuts.forEach((o) => { const d = messDays[dayIndex(o.date)]; if (d) d.optOuts += 1; });
    const residents = students.filter((s) => s.status === 'CHECKED_IN').length;
    const lastDay = (now.getFullYear() === y && now.getMonth() + 1 === m) ? now.getDate() : (to <= now ? days : 0);

    res.json({
      month,
      floorNumber,
      generatedAt: now,
      occupancy: {
        floors: floorRows,
        totals: occTotals,
        residents,
        newAdmissions: students.filter((s) => s.dateOfJoining && s.dateOfJoining >= from && s.dateOfJoining < to).length,
        withoutRoom: students.filter((s) => !s.roomId && s.status !== 'CHECKED_OUT').length,
      },
      leaves: {
        total: monthLeaves.length,
        byStatus: tally(monthLeaves, 'status'),
        byType: tally(monthLeaves, 'type'),
        lateReturns: lateReturns.length,
        outNow: leaves.filter((l) => l.status === 'CHECKED_OUT').length,
        overdueNow: overdueNow.length,
        topStudents: Object.values(perStudent).sort((a, b) => b.count - a.count || b.nights - a.nights).slice(0, 8),
        daily: leaveDaily,
      },
      visitors: {
        total: visitors.length,
        byRelationship: tally(visitors, 'relationship'),
        avgStayMinutes: stays.length ? Math.round(stays.reduce((s, x) => s + x, 0) / stays.length) : 0,
        stillInside: visitors.filter((v) => !v.checkOutTime).length,
        daily: visitorDaily,
      },
      complaints: {
        total: monthComplaints.length,
        byStatus: tally(monthComplaints, 'status'),
        byPriority: tally(monthComplaints, 'priority'),
        byCategory: Object.values(categories).sort((a, b) => b.count - a.count),
        openNow: openAll.length,
        openOver3Days: openAll.filter((c) => now - new Date(c.createdAt) > 3 * DAY).length,
      },
      mess: {
        residents,
        days: messDays,
        totals: Object.fromEntries(MEALS.map((meal) => [meal, attendance.filter((a) => a.mealType === meal).length])),
        optOuts: tally(optOuts, 'mealType'),
        servedDays: lastDay,
      },
    });
  } catch (error) {
    console.error('Error building report summary:', error);
    res.status(500).json({ message: 'Server error building the report.' });
  }
};

module.exports = { getSummary };
