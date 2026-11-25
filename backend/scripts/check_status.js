const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const students = await prisma.student.findMany({
    include: { user: true, room: true }
  });
  console.log(`Found ${students.length} students in DB:`);
  students.forEach(s => {
    console.log(`- [${s.rollNumber}] ${s.user.name} | Phone: ${s.phoneNumber} | Room: ${s.room ? s.room.roomNumber : 'None'} | Floor: ${s.room ? s.room.floorNumber : 'None'}`);
  });

  const rooms = await prisma.room.findMany({
    include: { students: { include: { user: true } } },
    orderBy: { roomNumber: 'asc' }
  });
  console.log(`\nFound ${rooms.length} rooms:`);
  rooms.forEach(r => {
    console.log(`- Room ${r.roomNumber} (Floor ${r.floorNumber}, Sharing: ${r.sharingType}, Capacity: ${r.capacity}): Occupants: ${r.students.map(s => s.user.name).join(', ') || 'Empty'}`);
  });

  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
