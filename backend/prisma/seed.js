const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Floor Master Data ──────────────────────────────────────────────
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

async function main() {
  console.log('🌱 Initializing Hari Pushp PG Master Database System...\n');

  const existingUsersCount = await prisma.user.count();
  const forceSeed = process.env.FORCE_SEED === 'true';

  if (existingUsersCount > 0 && !forceSeed) {
    console.log(`⚠️ Database already contains ${existingUsersCount} user(s).`);
    console.log('🛡️ Preserving existing database entries.');
    return;
  }

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
  console.log('✓ Created 5 floor master records.');

  // ── 3. Hash default password ───────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── 4. Create Dedicated Floor Warden Logins + Consolidated Super Admin ─────
  await prisma.user.create({
    data: { email: 'admin@haripushppg.com', password: hashedPassword, name: 'Chief Warden (Consolidated)', role: 'ADMIN', assignedFloor: null },
  });
  await prisma.user.create({
    data: { email: 'warden@haripushppg.com', password: hashedPassword, name: 'Dr. Shalini Sharma (Super Admin)', role: 'ADMIN', assignedFloor: null },
  });
  await prisma.user.create({
    data: { email: 'floor1@haripushppg.com', password: hashedPassword, name: 'Floor 1 Warden (Rajken Ent.)', role: 'ADMIN', assignedFloor: 1 },
  });
  await prisma.user.create({
    data: { email: 'floor2@haripushppg.com', password: hashedPassword, name: 'Floor 2 Warden (Vandana Ent.)', role: 'ADMIN', assignedFloor: 2 },
  });
  await prisma.user.create({
    data: { email: 'floor3@haripushppg.com', password: hashedPassword, name: 'Floor 3 Warden (Pushpa Ent.)', role: 'ADMIN', assignedFloor: 3 },
  });
  await prisma.user.create({
    data: { email: 'floor4@haripushppg.com', password: hashedPassword, name: 'Floor 4 Warden (Harish Chandra Ent.)', role: 'ADMIN', assignedFloor: 4 },
  });
  await prisma.user.create({
    data: { email: 'floor5@haripushppg.com', password: hashedPassword, name: 'Floor 5 Warden (Ramesh Ent.)', role: 'ADMIN', assignedFloor: 5 },
  });

  // Staff
  const securityUser = await prisma.user.create({
    data: { email: 'guard@haripushppg.com', password: hashedPassword, name: 'Sunita Devi', role: 'STAFF' }
  });

  await prisma.staff.create({
    data: { userId: securityUser.id, department: 'Security', designation: 'Head Female Guard', phoneNumber: '9876543210' },
  });

  console.log('✓ Created master admin & staff accounts.');

  // ── 5. Create 30 Rooms across 5 Floors ───────────────────────────────────
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

  const createFloorRooms = async (floor, floorNum, blockName) => {
    const configs = [
      { num: `${floorNum}01`, type: 3, cap: 3, beds: [`${floorNum}01-A`, `${floorNum}01-B`, `${floorNum}01-C`], ac: true },
      { num: `${floorNum}02`, type: 2, cap: 2, beds: [`${floorNum}02-A`, `${floorNum}02-B`], ac: false },
      { num: `${floorNum}03`, type: 2, cap: 2, beds: [`${floorNum}03-A`, `${floorNum}03-B`], ac: true },
      { num: `${floorNum}04`, type: 1, cap: 1, beds: [`${floorNum}04-Single`], ac: true },
      { num: `${floorNum}05`, type: 2, cap: 2, beds: [`${floorNum}05-A`, `${floorNum}05-B`], ac: false },
      { num: `${floorNum}06`, type: 2, cap: 2, beds: [`${floorNum}06-A`, `${floorNum}06-B`], ac: true },
    ];

    for (const cfg of configs) {
      await prisma.room.create({
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
    }
  };

  await createFloorRooms(floor1, 1, 'Hari Pushp');
  await createFloorRooms(floor2, 2, 'Vandana');
  await createFloorRooms(floor3, 3, 'Pushpa');
  await createFloorRooms(floor4, 4, 'Harish Chandra');
  await createFloorRooms(floor5, 5, 'Ramesh');

  console.log('✓ Created 30 room records across 5 floors (60 total beds, ALL AVAILABLE).');

  // ── 6. Tally ERP Account Heads ──────────────────────────────────────────
  const headsData = [
    { code: 'REV-HOSTEL',        name: 'Hostel Accommodation Income',        group: 'INCOME',    category: 'DIRECT' },
    { code: 'REV-MESS',          name: 'Mess & Catering Income',             group: 'INCOME',    category: 'DIRECT' },
    { code: 'REV-ELEC',          name: 'Electricity Charges Reimbursement',  group: 'INCOME',    category: 'DIRECT' },
    { code: 'EXP-ELEC-UTIL',     name: 'Electricity Utility Bill (State)',   group: 'EXPENSE',   category: 'DIRECT' },
    { code: 'EXP-MESS-PAYMENT',  name: 'Meenakshi Catering Payment',         group: 'EXPENSE',   category: 'DIRECT' },
    { code: 'EXP-MAINT',         name: 'Hostel Repairs & Maintenance',       group: 'EXPENSE',   category: 'INDIRECT' },
    { code: 'EXP-STAFF-SALARY',  name: 'Staff & Security Salaries',          group: 'EXPENSE',   category: 'INDIRECT' },
    { code: 'ASSET-BANK',        name: 'HDFC Bank Account (Current)',        group: 'ASSET',     category: 'CURRENT' },
    { code: 'ASSET-CASH',        name: 'Cash in Hand',                       group: 'ASSET',     category: 'CURRENT' },
    { code: 'LIAB-SECURITY',     name: 'Student Refundable Security Deposit',group: 'LIABILITY', category: 'CURRENT' },
    { code: 'LIAB-VENDOR-PAYABLE', name: 'Sundry Creditors / Vendor Payables', group: 'LIABILITY', category: 'CURRENT' },
    { code: 'EXP-CLEANING',       name: 'Cleaning Supplies & Housekeeping',   group: 'EXPENSE',   category: 'DIRECT' },
    { code: 'EXP-PETTY-CASH',     name: 'Petty Cash / Miscellaneous',         group: 'EXPENSE',   category: 'INDIRECT' },
    { code: 'EXP-WATER',          name: 'Water Supply & Tanker Charges',      group: 'EXPENSE',   category: 'DIRECT' },
    { code: 'EXP-TRANSPORT',      name: 'Transport & Travel Expenses',        group: 'EXPENSE',   category: 'INDIRECT' },
    { code: 'EXP-STATIONERY',     name: 'Stationery & Office Supplies',       group: 'EXPENSE',   category: 'INDIRECT' },
    { code: 'EXP-INTERNET',       name: 'Internet / WiFi & Telecom',          group: 'EXPENSE',   category: 'INDIRECT' },
    { code: 'EXP-PEST-CONTROL',   name: 'Pest Control & Fumigation',          group: 'EXPENSE',   category: 'DIRECT' },
    { code: 'EXP-KITCHEN',        name: 'Kitchen & Pantry Supplies',          group: 'EXPENSE',   category: 'DIRECT' },
    { code: 'EXP-OTHERS',         name: 'Other / General Expenses',           group: 'EXPENSE',   category: 'INDIRECT' },
  ];

  for (const hd of headsData) {
    await prisma.accountHead.create({ data: hd });
  }
  console.log('✓ Created 20 Tally Account Heads.');

  console.log('\n==================================================');
  console.log('🎉 CLEAN MASTER DATABASE INITIALIZATION COMPLETE!');
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
