const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up mock student data...');

  // Delete child records linked to students
  await prisma.leaveRequest.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.demandNote.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.mealOptOut.deleteMany();
  await prisma.nightAttendance.deleteMany();
  await prisma.messAttendance.deleteMany();
  await prisma.suggestion.deleteMany();

  // Find all student user IDs
  const students = await prisma.student.findMany({ select: { userId: true } });
  const studentUserIds = students.map(s => s.userId);

  await prisma.student.deleteMany();
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { in: studentUserIds } },
        { role: 'STUDENT' },
        { role: 'PENDING_STUDENT' }
      ]
    }
  });

  // Reset room status to AVAILABLE
  await prisma.room.updateMany({
    data: { status: 'AVAILABLE' }
  });

  console.log('✅ All mock student records cleared cleanly! Rooms reset to AVAILABLE.');
}

main()
  .catch(e => {
    console.error('Error clearing student data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
