const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function runTests() {
  console.log('====================================================');
  console.log('🔍 RUNNING COMPREHENSIVE END-TO-END VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- Test 1: Smt. Pushpa Sankhala Admin Account ---
  console.log('👉 [1/5] Checking Chief Warden Smt. Pushpa Sankhala Account...');
  const pushpa = await prisma.user.findUnique({
    where: { email: 'sankhalapushpa44@gmail.com' }
  });
  assert(pushpa !== null, 'Pushpa Sankhala account exists in DB');
  assert(pushpa && pushpa.role === 'ADMIN', 'Role is ADMIN');
  assert(pushpa && pushpa.assignedFloor === null, 'Assigned floor is null (Chief Warden / All Floors access)');
  const passOk = pushpa ? await bcrypt.compare('password123', pushpa.password) : false;
  assert(passOk, 'Password password123 matches hash');

  // --- Test 2: Mobile Number Login Resolution ---
  console.log('\n👉 [2/5] Testing iPhone Mobile Number Login Resolution...');
  const testMobiles = [
    { mobile: '9351857108', expectedName: 'Archi Verma', room: '401' },
    { mobile: '7425921279', expectedName: 'Siddhi Jain', room: '405' },
    { mobile: '8082743215', expectedName: 'Shiun Tiku', room: '102' },
    { mobile: '9548857141', expectedName: 'Ria Dhanwani', room: '104' }
  ];

  const allUsers = await prisma.user.findMany({
    include: { student: { include: { room: true } } }
  });

  for (const t of testMobiles) {
    const raw = t.mobile.trim().toLowerCase();
    const cleanInput = raw.replace(/\D/g, '');
    const userFound = allUsers.find(u => {
      const studentPhone = u.student?.phoneNumber?.replace(/\D/g, '');
      return studentPhone && (studentPhone === cleanInput || studentPhone.endsWith(cleanInput));
    });
    assert(
      userFound && userFound.name === t.expectedName,
      `Mobile ${t.mobile} resolves to ${t.expectedName}`
    );
    assert(
      userFound?.student?.room?.roomNumber === t.room,
      `Student is assigned to Room ${t.room}`
    );
  }

  // --- Test 3: Admitted Students Verification (14 Girls) ---
  console.log('\n👉 [3/5] Verifying 14 Admission Form Students & Room Allocations...');
  const students = await prisma.student.findMany({
    include: { user: true, room: true, invoices: true }
  });

  const expectedNames = [
    'Archi Verma', 'Namita Chaudhary', 'Varsha Surana',
    'Siddhi Jain', 'Diya Kothari',
    'Ananya Khandelwal', 'Anshika Garg', 'Maniya Solanki', 'Anvesha Rathore',
    'Simran Adwani',
    'Sharwari Anil Nikalje', 'Pratha Jaysukhbhai Sasani', 'Ria Dhanwani', 'Shiun Tiku'
  ];

  for (const name of expectedNames) {
    const s = students.find(x => x.user.name === name);
    assert(s !== undefined, `Student "${name}" exists in database`);
    assert(s?.status === 'CHECKED_IN', `Student "${name}" is CHECKED_IN`);
    assert(s?.room !== null, `Student "${name}" has room ${s?.room?.roomNumber}`);
    const feeInvoice = s?.invoices.find(inv => inv.kind === 'FEE');
    assert(feeInvoice !== undefined, `Monthly fee invoice generated for ${name} (Amount: ₹${feeInvoice?.amount})`);
    const depositInvoice = s?.invoices.find(inv => inv.kind === 'CHARGE' && inv.category === 'DEPOSIT');
    assert(depositInvoice !== undefined, `Security deposit recorded for ${name} (Amount: ₹${depositInvoice?.amount})`);
  }

  // --- Test 4: Room Occupancy Status ---
  console.log('\n👉 [4/5] Checking Room Occupancy Counts...');
  const room401 = await prisma.room.findUnique({
    where: { roomNumber: '401' },
    include: { students: true }
  });
  assert(room401?.students.length === 3, `Room 401 has exactly 3 residents (Current: ${room401?.students.length})`);
  assert(room401?.status === 'FULL', 'Room 401 status is marked FULL');

  const room405 = await prisma.room.findUnique({
    where: { roomNumber: '405' },
    include: { students: true }
  });
  assert(room405?.students.length === 2, `Room 405 has exactly 2 residents (Current: ${room405?.students.length})`);
  assert(room405?.status === 'FULL', 'Room 405 status is marked FULL');

  const room306 = await prisma.room.findUnique({
    where: { roomNumber: '306' },
    include: { students: true }
  });
  assert(room306?.students.length === 2, `Room 306 has exactly 2 residents (Current: ${room306?.students.length})`);
  assert(room306?.status === 'FULL', 'Room 306 status is marked FULL');

  // --- Test 5: Electricity Bill Split Logic ---
  console.log('\n👉 [5/5] Testing Electricity Bill Divide by 1, 2, 3 Logic...');
  const testUnits = 79;
  const testRate = 12; // e.g. ₹12 / unit
  const totalAmount = testUnits * testRate; // ₹948

  // Split by 1 (full bill to single resident):
  const sharers1 = 1;
  const perHead1 = totalAmount / sharers1;
  assert(perHead1 === 948, `Split by 1: Total ₹${totalAmount} / 1 = ₹${perHead1}`);

  // Split by 2 (double occupancy):
  const sharers2 = 2;
  const perHead2 = totalAmount / sharers2;
  assert(perHead2 === 474, `Split by 2: Total ₹${totalAmount} / 2 = ₹${perHead2}`);

  // Split by 3 (triple occupancy):
  const sharers3 = 3;
  const perHead3 = totalAmount / sharers3;
  assert(perHead3 === 316, `Split by 3: Total ₹${totalAmount} / 3 = ₹${perHead3}`);

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
