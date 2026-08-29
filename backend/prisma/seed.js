const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Floor Master Data (English) ──────────────────────────────────────────────
const FLOOR_DATA = [
  {
    floorNumber: 1,
    companyName: 'Rajken Enterprises',
    hostelName:  'Hari Pushp Girls Hostel',
    shortName:   'Floor 1 – Rajken',
    floorLabel:  'First Floor',
  },
  {
    floorNumber: 2,
    companyName: 'Vandana Enterprises',
    hostelName:  'Vandana Girls Hostel',
    shortName:   'Floor 2 – Vandana',
    floorLabel:  'Second Floor',
  },
  {
    floorNumber: 3,
    companyName: 'Pushpa Enterprises',
    hostelName:  'Pushpa Girls Hostel',
    shortName:   'Floor 3 – Pushpa',
    floorLabel:  'Third Floor',
  },
  {
    floorNumber: 4,
    companyName: 'Harish Chandra Enterprises',
    hostelName:  'Harish Chandra Girls Hostel',
    shortName:   'Floor 4 – Harish Chandra',
    floorLabel:  'Fourth Floor',
  },
  {
    floorNumber: 5,
    companyName: 'Ramesh Enterprises',
    hostelName:  'Ramesh Girls Hostel',
    shortName:   'Floor 5 – Ramesh',
    floorLabel:  'Fifth & Sixth Floor',
  },
];

// ─── Fee Constants ──────────────────────────────────────────────────────────────
const FEE = {
  SINGLE: 16000,  // Single sharing
  TWIN:   14000,  // Twin sharing
  TRIPLE: 12000,  // Triple sharing
  MESS:    3000,  // Meenakshi Enterprises per student
};

async function main() {
  console.log('🌱 Seeding Hari Pushp PG Girls Hostel database...\n');

  // ── 1. Clear existing data (order matters for FK constraints) ──────────────
  await prisma.nightAttendance.deleteMany({});
  await prisma.mealOptOut.deleteMany({});
  await prisma.electricityReading.deleteMany({});
  await prisma.demandNote.deleteMany({});
  await prisma.visitor.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.floor.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✓ Cleared old database tables.');

  // ── 2. Create Floor Master Records ─────────────────────────────────────────
  const floors = [];
  for (const fd of FLOOR_DATA) {
    const floor = await prisma.floor.create({ data: fd });
    floors.push(floor);
  }
  const [floor1, floor2, floor3, floor4, floor5] = floors;
  console.log('✓ Created 5 floor records.');

  // ── 3. Hash default password ───────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── 4. Create Dedicated Floor Warden Logins + Consolidated Super Admin ─────
  // Consolidated Super Admins (Can view all floors combined)
  const superAdmin = await prisma.user.create({
    data: { email: 'admin@haripushppg.com', password: hashedPassword, name: 'Chief Warden (Consolidated)', role: 'ADMIN', assignedFloor: null },
  });
  const wardenAdmin = await prisma.user.create({
    data: { email: 'warden@haripushppg.com', password: hashedPassword, name: 'Dr. Shalini Sharma (Super Admin)', role: 'ADMIN', assignedFloor: null },
  });

  // Dedicated Floor Wardens (Auto-locked to their specific floor)
  const floor1Admin = await prisma.user.create({
    data: { email: 'floor1@haripushppg.com', password: hashedPassword, name: 'Floor 1 Warden (Rajken Ent.)', role: 'ADMIN', assignedFloor: 1 },
  });
  const floor2Admin = await prisma.user.create({
    data: { email: 'floor2@haripushppg.com', password: hashedPassword, name: 'Floor 2 Warden (Vandana Ent.)', role: 'ADMIN', assignedFloor: 2 },
  });
  const floor3Admin = await prisma.user.create({
    data: { email: 'floor3@haripushppg.com', password: hashedPassword, name: 'Floor 3 Warden (Pushpa Ent.)', role: 'ADMIN', assignedFloor: 3 },
  });
  const floor4Admin = await prisma.user.create({
    data: { email: 'floor4@haripushppg.com', password: hashedPassword, name: 'Floor 4 Warden (Harish Chandra Ent.)', role: 'ADMIN', assignedFloor: 4 },
  });
  const floor5Admin = await prisma.user.create({
    data: { email: 'floor5@haripushppg.com', password: hashedPassword, name: 'Floor 5 Warden (Ramesh Ent.)', role: 'ADMIN', assignedFloor: 5 },
  });

  // Floor 1 students
  const sUser1 = await prisma.user.create({ data: { email: 'pooja@haripushppg.com',   password: hashedPassword, name: 'Pooja Sharma',   role: 'STUDENT' } });
  const sUser2 = await prisma.user.create({ data: { email: 'ananya@haripushppg.com',  password: hashedPassword, name: 'Ananya Mehta',   role: 'STUDENT' } });
  // Floor 2 students
  const sUser3 = await prisma.user.create({ data: { email: 'sneha@haripushppg.com',   password: hashedPassword, name: 'Sneha Patel',    role: 'STUDENT' } });
  const sUser4 = await prisma.user.create({ data: { email: 'priya@haripushppg.com',   password: hashedPassword, name: 'Priya Singh',    role: 'STUDENT' } });
  // Floor 3 students
  const sUser5 = await prisma.user.create({ data: { email: 'kavya@haripushppg.com',   password: hashedPassword, name: 'Kavya Reddy',    role: 'STUDENT' } });
  const sUser6 = await prisma.user.create({ data: { email: 'riya@haripushppg.com',    password: hashedPassword, name: 'Riya Verma',     role: 'STUDENT' } });
  const sUser7 = await prisma.user.create({ data: { email: 'shruti@haripushppg.com',  password: hashedPassword, name: 'Shruti Jain',    role: 'STUDENT' } });
  // Floor 4 students
  const sUser8 = await prisma.user.create({ data: { email: 'divya@haripushppg.com',   password: hashedPassword, name: 'Divya Gupta',    role: 'STUDENT' } });
  const sUser9 = await prisma.user.create({ data: { email: 'neha@haripushppg.com',    password: hashedPassword, name: 'Neha Tiwari',    role: 'STUDENT' } });
  // Floor 5 students
  const sUser10 = await prisma.user.create({ data: { email: 'aarti@haripushppg.com', password: hashedPassword, name: 'Aarti Mishra',   role: 'STUDENT' } });
  const sUser11 = await prisma.user.create({ data: { email: 'meera@haripushppg.com', password: hashedPassword, name: 'Meera Chauhan',  role: 'STUDENT' } });

  // Staff
  const securityUser = await prisma.user.create({ data: { email: 'guard@haripushppg.com', password: hashedPassword, name: 'Sunita Devi', role: 'STAFF' } });

  console.log('✓ Created users (5 Floor Wardens + Consolidated Super Admin).');

  // ── 5. Create Staff Entry ──────────────────────────────────────────────────
  await prisma.staff.create({
    data: { userId: securityUser.id, department: 'Security', designation: 'Head Female Guard', phoneNumber: '9876543210' },
  });

  // ── 6. Create Rooms with floor assignments ─────────────────────────────────
  const assetsSingle = JSON.stringify([
    { name: 'Bed', status: 'Good' }, { name: 'Study Table', status: 'Good' },
    { name: 'Chair', status: 'Good' }, { name: 'Ceiling Fan', status: 'Good' },
    { name: 'Wardrobe', status: 'Good' }, { name: 'LAN Port', status: 'Working' },
  ]);
  const assetsTwin = JSON.stringify([
    { name: 'Bed x2', status: 'Good' }, { name: 'Study Table x2', status: 'Good' },
    { name: 'Chair x2', status: 'Good' }, { name: 'Ceiling Fan', status: 'Good' },
    { name: 'LAN Port', status: 'Working' },
  ]);
  const assetsTriple = JSON.stringify([
    { name: 'Bed x3', status: 'Good' }, { name: 'Study Table x3', status: 'Good' },
    { name: 'Chair x3', status: 'Good' }, { name: 'Ceiling Fan', status: 'Good' },
    { name: 'LAN Port', status: 'Working' },
  ]);

  // Helper to create 6 rooms per floor with exact bed ID mappings
  const createFloorRooms = async (floor, floorNum, blockName) => {
    const createdRooms = {};
    const configs = [
      { num: `${floorNum}01`, type: 3, cap: 3, beds: [`${floorNum}01-A`, `${floorNum}01-B`, `${floorNum}01-C`], ac: true },
      { num: `${floorNum}02`, type: 2, cap: 2, beds: [`${floorNum}02-A`, `${floorNum}02-B`], ac: false },
      { num: `${floorNum}03`, type: 2, cap: 2, beds: [`${floorNum}03-A`, `${floorNum}03-B`], ac: true },
      { num: `${floorNum}04`, type: 1, cap: 1, beds: [`${floorNum}04-Single`], ac: true },
      { num: `${floorNum}05`, type: 2, cap: 2, beds: [`${floorNum}05-A`, `${floorNum}05-B`], ac: false },
      { num: `${floorNum}06`, type: 2, cap: 2, beds: [`${floorNum}06-A`, `${floorNum}06-B`], ac: true },
    ];

    for (const cfg of configs) {
      const rm = await prisma.room.create({
        data: {
          roomNumber: cfg.num,
          block: blockName,
          floorId: floor.id,
          floorNumber: floorNum,
          sharingType: cfg.type,
          capacity: cfg.cap,
          isAc: cfg.ac,
          status: 'AVAILABLE',
          bedMapping: JSON.stringify(cfg.beds),
          assets: cfg.type === 1 ? assetsSingle : cfg.type === 2 ? assetsTwin : assetsTriple,
        }
      });
      createdRooms[cfg.num] = rm;
    }
    return createdRooms;
  };

  const f1Rooms = await createFloorRooms(floor1, 1, 'Hari Pushp');
  const f2Rooms = await createFloorRooms(floor2, 2, 'Vandana');
  const f3Rooms = await createFloorRooms(floor3, 3, 'Pushpa');
  const f4Rooms = await createFloorRooms(floor4, 4, 'Harish Chandra');
  const f5Rooms = await createFloorRooms(floor5, 5, 'Ramesh');

  const room101 = f1Rooms['101'], room102 = f1Rooms['102'];
  const room201 = f2Rooms['201'], room202 = f2Rooms['202'];
  const room301 = f3Rooms['301'], room302 = f3Rooms['302'], room303 = f3Rooms['303'];
  const room401 = f4Rooms['401'], room402 = f4Rooms['402'];
  const room501 = f5Rooms['501'], room502 = f5Rooms['502'];

  console.log('✓ Created 30 room records with exact bed ID mappings across 5 floors (60 total beds).');

  // Helper to create Student profile with specific Bed ID
  const makeStudent = (uId, roll, phone, parent, roomId, bedId, dateJoin, father) => ({
    userId: uId, rollNumber: roll, phoneNumber: phone, parentContact: parent,
    roomId, bedId, status: 'CHECKED_IN', dateOfJoining: new Date(dateJoin), fatherName: father,
  });

  // Floor 1
  const student1 = await prisma.student.create({ data: makeStudent(sUser1.id, 'HP-2024-101', '9810011111', '9810099901', room101.id, '101-A', '2024-07-01', 'Rajesh Sharma') });
  const student2 = await prisma.student.create({ data: makeStudent(sUser2.id, 'HP-2024-102', '9810011112', '9810099902', room101.id, '101-B', '2024-07-05', 'Vikram Mehta') });
  // Floor 2
  const student3 = await prisma.student.create({ data: makeStudent(sUser3.id, 'VN-2024-201', '9810022221', '9810099903', room201.id, '201-A', '2024-07-10', 'Suresh Patel') });
  const student4 = await prisma.student.create({ data: makeStudent(sUser4.id, 'VN-2024-202', '9810022222', '9810099904', room202.id, '202-A', '2024-07-12', 'Ramesh Singh') });
  // Floor 3
  const student5 = await prisma.student.create({ data: makeStudent(sUser5.id, 'PS-2024-301', '9810033331', '9810099905', room301.id, '301-A', '2024-07-15', 'Venkat Reddy') });
  const student6 = await prisma.student.create({ data: makeStudent(sUser6.id, 'PS-2024-302', '9810033332', '9810099906', room302.id, '302-A', '2024-07-18', 'Anil Verma') });
  const student7 = await prisma.student.create({ data: makeStudent(sUser7.id, 'PS-2024-303', '9810033333', '9810099907', room303.id, '303-A', '2024-07-20', 'Pravin Jain') });
  // Floor 4
  const student8 = await prisma.student.create({ data: makeStudent(sUser8.id, 'HC-2024-401', '9810044441', '9810099908', room401.id, '401-A', '2024-07-22', 'Alok Gupta') });
  const student9 = await prisma.student.create({ data: makeStudent(sUser9.id, 'HC-2024-402', '9810044442', '9810099909', room402.id, '402-A', '2024-07-25', 'Mahesh Tiwari') });
  // Floor 5
  const student10 = await prisma.student.create({ data: makeStudent(sUser10.id, 'RM-2024-501', '9810055551', '9810099910', room501.id, '501-A', '2024-07-28', 'Dinesh Mishra') });
  const student11 = await prisma.student.create({ data: makeStudent(sUser11.id, 'RM-2024-502', '9810055552', '9810099911', room502.id, '502-A', '2024-08-01', 'Sunil Chauhan') });

  const allStudents = [student1, student2, student3, student4, student5, student6, student7, student8, student9, student10, student11];
  console.log('✓ Created 11 student profiles.');

  // ── 7. Update Room Status to OCCUPIED ──────────────────────────────────────
  const occupiedRoomIds = [room101.id, room201.id, room202.id, room301.id, room302.id, room303.id, room401.id, room402.id, room501.id, room502.id];
  await prisma.room.updateMany({ where: { id: { in: occupiedRoomIds } }, data: { status: 'OCCUPIED' } });

  // ── 8. Create Invoices (Floor-wise tagged) ──────────────────────────────────
  await prisma.invoice.createMany({
    data: [
      { studentId: student1.id, amount: FEE.TWIN,   dueDate: new Date('2026-09-09'), status: 'PAID',   paidAt: new Date('2026-08-10'), floorNumber: 1, companyName: 'Rajken Enterprises' },
      { studentId: student2.id, amount: FEE.TWIN,   dueDate: new Date('2026-09-09'), status: 'UNPAID', floorNumber: 1, companyName: 'Rajken Enterprises' },
      { studentId: student3.id, amount: FEE.TWIN,   dueDate: new Date('2026-09-09'), status: 'PAID',   paidAt: new Date('2026-08-11'), floorNumber: 2, companyName: 'Vandana Enterprises' },
      { studentId: student4.id, amount: FEE.TRIPLE, dueDate: new Date('2026-09-09'), status: 'UNPAID', floorNumber: 2, companyName: 'Vandana Enterprises' },
      { studentId: student5.id, amount: FEE.SINGLE, dueDate: new Date('2026-09-09'), status: 'PAID',   paidAt: new Date('2026-08-09'), floorNumber: 3, companyName: 'Pushpa Enterprises' },
      { studentId: student6.id, amount: FEE.TWIN,   dueDate: new Date('2026-09-09'), status: 'UNPAID', floorNumber: 3, companyName: 'Pushpa Enterprises' },
      { studentId: student7.id, amount: FEE.TRIPLE, dueDate: new Date('2026-09-09'), status: 'PAID',   paidAt: new Date('2026-08-10'), floorNumber: 3, companyName: 'Pushpa Enterprises' },
      { studentId: student8.id, amount: FEE.TWIN,   dueDate: new Date('2026-09-09'), status: 'UNPAID', floorNumber: 4, companyName: 'Harish Chandra Enterprises' },
      { studentId: student9.id, amount: FEE.TWIN,   dueDate: new Date('2026-09-09'), status: 'PAID',   paidAt: new Date('2026-08-12'), floorNumber: 4, companyName: 'Harish Chandra Enterprises' },
      { studentId: student10.id, amount: FEE.TWIN,  dueDate: new Date('2026-09-09'), status: 'UNPAID', floorNumber: 5, companyName: 'Ramesh Enterprises' },
      { studentId: student11.id, amount: FEE.TWIN,  dueDate: new Date('2026-09-09'), status: 'PAID',   paidAt: new Date('2026-08-10'), floorNumber: 5, companyName: 'Ramesh Enterprises' },
    ],
  });
  console.log('✓ Created floor-wise invoices.');

  // ── 9. Create Demand Notes (10-to-10 billing cycle, Floor-wise tagged) ──────
  const demandNoteData = [
    { student: student1, sharingFee: FEE.TWIN,   floorNumber: 1, companyName: 'Rajken Enterprises',           elecUnits: 25, elecRate: 8, elecAmt: 200 },
    { student: student2, sharingFee: FEE.TWIN,   floorNumber: 1, companyName: 'Rajken Enterprises',           elecUnits: 25, elecRate: 8, elecAmt: 200 },
    { student: student3, sharingFee: FEE.TWIN,   floorNumber: 2, companyName: 'Vandana Enterprises',          elecUnits: 30, elecRate: 8, elecAmt: 240 },
    { student: student4, sharingFee: FEE.TRIPLE, floorNumber: 2, companyName: 'Vandana Enterprises',          elecUnits: 20, elecRate: 8, elecAmt: 160 },
    { student: student5, sharingFee: FEE.SINGLE, floorNumber: 3, companyName: 'Pushpa Enterprises',           elecUnits: 40, elecRate: 8, elecAmt: 320 },
    { student: student6, sharingFee: FEE.TWIN,   floorNumber: 3, companyName: 'Pushpa Enterprises',           elecUnits: 35, elecRate: 8, elecAmt: 280 },
    { student: student7, sharingFee: FEE.TRIPLE, floorNumber: 3, companyName: 'Pushpa Enterprises',           elecUnits: 15, elecRate: 8, elecAmt: 120 },
    { student: student8, sharingFee: FEE.TWIN,   floorNumber: 4, companyName: 'Harish Chandra Enterprises',   elecUnits: 28, elecRate: 8, elecAmt: 224 },
    { student: student9, sharingFee: FEE.TWIN,   floorNumber: 4, companyName: 'Harish Chandra Enterprises',   elecUnits: 28, elecRate: 8, elecAmt: 224 },
    { student: student10, sharingFee: FEE.TWIN,  floorNumber: 5, companyName: 'Ramesh Enterprises',           elecUnits: 32, elecRate: 8, elecAmt: 256 },
    { student: student11, sharingFee: FEE.TWIN,  floorNumber: 5, companyName: 'Ramesh Enterprises',           elecUnits: 32, elecRate: 8, elecAmt: 256 },
  ];

  for (const d of demandNoteData) {
    const total = d.sharingFee + d.elecAmt + FEE.MESS;
    await prisma.demandNote.create({
      data: {
        studentId: d.student.id,
        billingMonth: '2026-08',
        cycleStart: new Date('2026-08-10'),
        cycleEnd: new Date('2026-09-09'),
        floorNumber: d.floorNumber,
        companyName: d.companyName,
        hostelFee: d.sharingFee,
        electricityUnits: d.elecUnits,
        electricityRate: d.elecRate,
        electricityAmount: d.elecAmt,
        messFee: FEE.MESS,
        otherCharges: 0,
        totalAmount: total,
        status: d.student.id === student1.id ? 'PAID' : 'PENDING',
        paidAt: d.student.id === student1.id ? new Date('2026-08-10') : null,
      },
    });
  }
  console.log('✓ Created 11 Demand Notes (10-to-10 cycle, Floor-wise tagged).');

  // ── 10. Sample Complaints ───────────────────────────────────────────────────
  await prisma.complaint.createMany({
    data: [
      { studentId: student1.id, category: 'PLUMBING',   description: 'Bathroom tap leaking in Room 101', priority: 'MEDIUM', status: 'IN_PROGRESS' },
      { studentId: student3.id, category: 'ELECTRICAL', description: 'Study lamp socket loose in Room 201', priority: 'LOW',    status: 'PENDING' },
      { studentId: student5.id, category: 'INTERNET',   description: 'Wi-Fi disconnects frequently on Floor 3', priority: 'HIGH', status: 'RESOLVED', wardenNotes: 'Router rebooted & password reset.' },
      { studentId: student8.id, category: 'CLEANING',   description: 'Balcony needs cleaning on Floor 4', priority: 'MEDIUM', status: 'PENDING' },
      { studentId: student10.id, category: 'FOOD',      description: 'Breakfast paratha cold today', priority: 'LOW', status: 'RESOLVED', wardenNotes: 'Instructed cook team.' },
    ],
  });
  console.log('✓ Created sample complaints.');

  // ── 11. Sample Leave Requests ───────────────────────────────────────────────
  await prisma.leaveRequest.createMany({
    data: [
      {
        studentId: student2.id, type: 'HOME_LEAVE', reason: 'Visiting family in Jaipur',
        destination: 'Jaipur, Rajasthan', startDate: new Date('2026-08-25'), endDate: new Date('2026-08-28'),
        departureTime: '10:00', expectedReturnTime: '18:00', parentNotified: true, status: 'APPROVED', comments: 'Approved by Warden',
      },
      {
        studentId: student4.id, type: 'OUTING', reason: 'Shopping at Mall of India',
        destination: 'Sector 18 Noida', startDate: new Date('2026-08-21'), endDate: new Date('2026-08-21'),
        departureTime: '14:00', expectedReturnTime: '20:00', parentNotified: false, status: 'PENDING',
      },
      {
        studentId: student6.id, type: 'EMERGENCY', reason: 'Medical appointment',
        destination: 'Fortis Hospital Noida', startDate: new Date('2026-08-22'), endDate: new Date('2026-08-22'),
        departureTime: '09:00', expectedReturnTime: '13:00', parentNotified: true, status: 'APPROVED', comments: 'Medical Leave',
      },
    ],
  });
  console.log('✓ Created sample leave requests.');

  // ── 12. Sample Visitors ─────────────────────────────────────────────────────
  await prisma.visitor.createMany({
    data: [
      { studentId: student1.id, name: 'Rajesh Sharma (Father)', phone: '9810099901', relationship: 'Father', checkInTime: new Date() },
      { studentId: student5.id, name: 'Sunita Reddy (Mother)',  phone: '9810099905', relationship: 'Mother', checkInTime: new Date(Date.now() - 3600000), checkOutTime: new Date() },
    ],
  });
  console.log('✓ Created sample visitors.');

  const roomsForReadings = await prisma.room.findMany({});
  for (const room of roomsForReadings) {
    const readingMonth = '2026-08';
    const prev = Math.floor(Math.random() * 200) + 100;
    const curr = prev + Math.floor(Math.random() * 80) + 20;
    const units = curr - prev;
    await prisma.electricityReading.create({
      data: {
        roomId: room.id,
        readingMonth,
        readingDate: new Date('2026-08-04T10:00:00Z'),
        previousReading: prev,
        currentReading: curr,
        unitsConsumed: units,
        ratePerUnit: 8.0,
        totalAmount: units * 8.0,
        enteredBy: 'Dr. Shalini Sharma',
      },
    });
  }
  console.log('✓ Created electricity readings for August 2026.');

  // ── 14. Biometric Mess Attendance (7 days history) ─────────────────────────
  const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
  console.log('  Generating biometric mess attendance...');
  const messAttendanceData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    for (const student of allStudents) {
      for (const meal of mealTypes) {
        if (Math.random() < 0.82) {
          const ts = new Date(d);
          if (meal === 'BREAKFAST') ts.setHours(8, 15, 0);
          else if (meal === 'LUNCH')  ts.setHours(13, 10, 0);
          else if (meal === 'SNACKS') ts.setHours(17, 0, 0);
          else                        ts.setHours(20, 20, 0);
          messAttendanceData.push({
            studentId: student.id, mealType: meal, date: dateStr, timestamp: ts, verifiedBy: Math.random() > 0.5 ? 'BIOMETRIC_FINGERPRINT' : 'BIOMETRIC_FACE'
          });
        }
      }
    }
  }
  await prisma.messAttendance.createMany({ data: messAttendanceData });
  console.log('✓ Generated mess attendance history.');

  // ── 15. Meal Opt-Outs ──────────────────────────────────────────────────────
  await prisma.mealOptOut.createMany({
    data: [
      { studentId: student1.id, date: new Date().toISOString().split('T')[0], mealType: 'DINNER' },
      { studentId: student3.id, date: new Date().toISOString().split('T')[0], mealType: 'BREAKFAST' },
      { studentId: student5.id, date: new Date().toISOString().split('T')[0], mealType: 'LUNCH' },
    ],
  });
  console.log('✓ Created sample meal opt-outs.');

  // ── 16. Night Attendance ───────────────────────────────────────────────────
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  for (const student of allStudents) {
    const status = Math.random() > 0.1 ? 'PRESENT' : 'ABSENT';
    const fNum = student.id === student1.id || student.id === student2.id ? 1 :
                 student.id === student3.id || student.id === student4.id ? 2 :
                 student.id === student5.id || student.id === student6.id || student.id === student7.id ? 3 :
                 student.id === student8.id || student.id === student9.id ? 4 : 5;
    await prisma.nightAttendance.create({
      data: { studentId: student.id, date: yesterdayStr, status, floorNumber: fNum, markedByUserId: superAdmin.id, parentNotified: false },
    });
  }
  console.log('✓ Created night attendance for yesterday.');

  // ── 17. Poll ───────────────────────────────────────────────────────────────
  await prisma.poll.create({
    data: {
      question: 'What is your favourite breakfast option in the mess menu?',
      options: JSON.stringify(['Paratha + Curd', 'Idli + Sambar', 'Poha', 'Dalia / Porridge']),
      isActive: true,
      createdById: superAdmin.id,
    },
  });
  console.log('✓ Created sample poll.');

  // ── 18. Notices ────────────────────────────────────────────────────────────
  await prisma.notice.createMany({
    data: [
      { title: 'Sub-Meter Electricity Reading Date', content: 'Sub-meter readings for August cycle will be taken on August 3rd-4th. Please ensure access to room sub-meters.', category: 'URGENT', target: 'ALL', postedBy: 'Chief Warden' },
      { title: 'Night Attendance Round Timings', content: 'Warden night rounds take place between 9:30 PM - 10:15 PM daily across all 5 floors.', category: 'GENERAL', target: 'STUDENTS', postedBy: 'Chief Warden' },
    ],
  });
  console.log('✓ Created initial notices.');

  console.log('\n==================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('==================================================');
  console.log('\n🔑 Dedicated Warden & Super Admin Credentials:');
  console.log('--------------------------------------------------');
  console.log('• Floor 1 Admin:  floor1@haripushppg.com  / password123 (Rajken Enterprises)');
  console.log('• Floor 2 Admin:  floor2@haripushppg.com  / password123 (Vandana Enterprises)');
  console.log('• Floor 3 Admin:  floor3@haripushppg.com  / password123 (Pushpa Enterprises)');
  console.log('• Floor 4 Admin:  floor4@haripushppg.com  / password123 (Harish Chandra Ent.)');
  console.log('• Floor 5 Admin:  floor5@haripushppg.com  / password123 (Ramesh Enterprises)');
  console.log('• Super Admin:    admin@haripushppg.com   / password123 (Consolidated All Floors)');
  console.log('• Chief Warden:   warden@haripushppg.com  / password123 (Consolidated All Floors)');
  console.log('--------------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
