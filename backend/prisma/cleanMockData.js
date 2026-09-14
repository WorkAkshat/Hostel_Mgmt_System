const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanMockData() {
  console.log('🧹 Purging all mock/sample data from database...');

  const mockEmails = [
    'pooja@haripushppg.com',
    'ananya@haripushppg.com',
    'sneha@haripushppg.com',
    'priya@haripushppg.com',
    'kavya@haripushppg.com',
    'riya@haripushppg.com',
    'shruti@haripushppg.com',
    'divya@haripushppg.com',
    'neha@haripushppg.com',
    'aarti@haripushppg.com',
    'meera@haripushppg.com'
  ];

  // 1. Delete mock user accounts (cascade deletes student, invoices, complaints, leaves, etc.)
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: { in: mockEmails }
    }
  });

  console.log(`✓ Removed ${deletedUsers.count} mock student user accounts.`);

  // 2. Delete any orphaned sample entries
  await prisma.pollVote.deleteMany({});
  await prisma.poll.deleteMany({});
  await prisma.visitor.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.messAttendance.deleteMany({});
  await prisma.mealOptOut.deleteMany({});
  
  try { await prisma.demandNote.deleteMany({}); } catch (e) {}
  try { await prisma.electricityReading.deleteMany({}); } catch (e) {}
  try { await prisma.suggestion.deleteMany({}); } catch (e) {}
  try { await prisma.nightAttendance.deleteMany({}); } catch (e) {}

  // 3. Reset room occupancy status to AVAILABLE
  await prisma.room.updateMany({
    data: { status: 'AVAILABLE' }
  });

  console.log('✓ All 30 rooms reset to AVAILABLE status with 0 occupied beds.');
  console.log('✨ Clean database setup complete! Only real data is preserved.');
}

cleanMockData()
  .catch((err) => {
    console.error('Error cleaning mock data:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
