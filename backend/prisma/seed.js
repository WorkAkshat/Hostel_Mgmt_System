const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Girls Hostel Management System (GHMS) database...');

  // 1. Clear existing data
  await prisma.messAttendance.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.visitor.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleared existing data.');

  // 2. Hash default password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. Create Users
  // Warden User (ADMIN)
  const adminUser = await prisma.user.create({
    data: {
      email: 'warden@hms.com',
      password: hashedPassword,
      name: 'Dr. Shalini Sharma',
      role: 'ADMIN',
    },
  });

  // Student Users (STUDENT - Girls names)
  const studentUser1 = await prisma.user.create({
    data: {
      email: 'pooja@hms.com',
      password: hashedPassword,
      name: 'Pooja Sharma',
      role: 'STUDENT',
    },
  });

  const studentUser2 = await prisma.user.create({
    data: {
      email: 'ananya@hms.com',
      password: hashedPassword,
      name: 'Ananya Mehta',
      role: 'STUDENT',
    },
  });

  const studentUser3 = await prisma.user.create({
    data: {
      email: 'sneha@hms.com',
      password: hashedPassword,
      name: 'Sneha Patel',
      role: 'STUDENT',
    },
  });

  // Staff User (STAFF - Security Guard / Warden Assistant)
  const securityUser = await prisma.user.create({
    data: {
      email: 'guard@hms.com',
      password: hashedPassword,
      name: 'Sunita Devi',
      role: 'STAFF',
    },
  });

  console.log('Created Users.');

  // 4. Create Staff Entry
  await prisma.staff.create({
    data: {
      userId: securityUser.id,
      department: 'Security',
      designation: 'Head Female Guard',
      phoneNumber: '9876543210',
    },
  });

  // 5. Create Rooms
  const assetsTemplate = JSON.stringify([
    { name: 'Bed', status: 'Good' },
    { name: 'Study Table', status: 'Good' },
    { name: 'Chair', status: 'Good' },
    { name: 'Ceiling Fan', status: 'Good' },
    { name: 'LAN Port', status: 'Working' },
  ]);

  const roomA101 = await prisma.room.create({
    data: {
      roomNumber: 'A-101',
      block: 'Block A (UG)',
      sharingType: 2,
      isAc: true,
      status: 'AVAILABLE',
      assets: assetsTemplate,
    },
  });

  const roomA102 = await prisma.room.create({
    data: {
      roomNumber: 'A-102',
      block: 'Block A (UG)',
      sharingType: 2,
      isAc: true,
      status: 'AVAILABLE',
      assets: assetsTemplate,
    },
  });

  const roomB101 = await prisma.room.create({
    data: {
      roomNumber: 'B-101',
      block: 'Block B (PG)',
      sharingType: 1,
      isAc: false,
      status: 'AVAILABLE',
      assets: assetsTemplate,
    },
  });

  console.log('Created Rooms.');

  // 6. Create Students linked to Users and Rooms
  const student1 = await prisma.student.create({
    data: {
      userId: studentUser1.id,
      rollNumber: '2024CS101',
      phoneNumber: '9888877771',
      parentContact: '9111122221',
      status: 'CHECKED_IN',
      roomId: roomA101.id,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      userId: studentUser2.id,
      rollNumber: '2024EC102',
      phoneNumber: '9888877772',
      parentContact: '9111122222',
      status: 'CHECKED_IN',
      roomId: roomA101.id,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      userId: studentUser3.id,
      rollNumber: '2024EE103',
      phoneNumber: '9888877773',
      parentContact: '9111122223',
      status: 'CHECKED_IN',
      roomId: roomB101.id,
    },
  });

  // Update room occupancy state in context of room sharing limits
  await prisma.room.update({
    where: { id: roomA101.id },
    data: { status: 'FULL' },
  });

  console.log('Created Student details and room mappings.');

  // 7. Create Notices
  await prisma.notice.createMany({
    data: [
      {
        title: 'Curfew & Biometric Verification',
        content: 'All residents are reminded that curfew time is 8:30 PM. Biometric gate check-out will lock after 8:00 PM unless a pre-approved late gate pass exists.',
        priority: 'URGENT',
        postedBy: 'Dr. Shalini Sharma',
      },
      {
        title: 'Water Supply Outage',
        content: 'There will be a temporary water supply maintenance tomorrow between 9:00 AM and 12:00 PM. Please store water in advance.',
        priority: 'WARNING',
        postedBy: 'Dr. Shalini Sharma',
      },
      {
        title: 'Hostel Fest Registrations Open',
        content: 'Registrations for the Girls Hostel Annual Fest "SANSKRITI 2026" are now open. Register at the warden office.',
        priority: 'INFO',
        postedBy: 'Dr. Shalini Sharma',
      },
    ],
  });

  console.log('Created Notices.');

  // 8. Create Complaints
  await prisma.complaint.create({
    data: {
      studentId: student1.id,
      category: 'Electrical',
      description: 'The ceiling fan in A-101 is making a loud squeaking sound and running very slowly.',
      priority: 'MEDIUM',
      status: 'PENDING',
    },
  });

  await prisma.complaint.create({
    data: {
      studentId: student2.id,
      category: 'Wi-Fi',
      description: 'LAN port in room A-101 has no internet connection.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      wardenNotes: 'Network technician has been assigned.',
    },
  });

  console.log('Created Complaints.');

  // 9. Create Leave Requests
  await prisma.leaveRequest.create({
    data: {
      studentId: student1.id,
      startDate: new Date('2026-07-18T17:00:00Z'),
      endDate: new Date('2026-07-20T08:00:00Z'),
      type: 'NIGHT_OUT',
      reason: 'Visiting parents in local city.',
      status: 'PENDING',
    },
  });

  await prisma.leaveRequest.create({
    data: {
      studentId: student3.id,
      startDate: new Date('2026-07-10T14:00:00Z'),
      endDate: new Date('2026-07-15T18:00:00Z'),
      type: 'OUT_OF_STATION',
      reason: 'Going home for family function.',
      status: 'APPROVED',
      approvedBy: 'Dr. Shalini Sharma',
      comments: 'Granted. Please log exit and entry via gate biometric scan.',
    },
  });

  console.log('Created Leave Requests.');

  // 10. Create Invoices
  await prisma.invoice.create({
    data: {
      studentId: student1.id,
      amount: 15500,
      dueDate: new Date('2026-07-15T23:59:59Z'),
      status: 'UNPAID',
    },
  });

  await prisma.invoice.create({
    data: {
      studentId: student2.id,
      amount: 15500,
      dueDate: new Date('2026-07-15T23:59:59Z'),
      status: 'UNPAID',
    },
  });

  await prisma.invoice.create({
    data: {
      studentId: student3.id,
      amount: 12000,
      dueDate: new Date('2026-07-15T23:59:59Z'),
      status: 'PAID',
      paidAt: new Date('2026-07-05T10:30:00Z'),
    },
  });

  console.log('Created Invoices.');

  // 11. Create Visitors
  await prisma.visitor.create({
    data: {
      studentId: student1.id,
      name: 'Satish Sharma',
      phone: '9444455555',
      relationship: 'Father',
      checkInTime: new Date('2026-07-12T10:00:00Z'),
      checkOutTime: new Date('2026-07-12T16:30:00Z'),
    },
  });

  console.log('Created Visitors.');

  // 12. Create Biometric Mess Attendance Logs
  // Create realistic attendance data for the past 7 days
  const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
  const studentsList = [student1, student2, student3];

  console.log('Generating biometric mess attendance history...');

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Seed logs
    for (const student of studentsList) {
      for (const meal of mealTypes) {
        // 85% attendance rate simulation
        if (Math.random() < 0.85) {
          const timestamp = new Date(d);
          // adjust timestamp time for meal type
          if (meal === 'BREAKFAST') timestamp.setHours(8, 15, 0);
          else if (meal === 'LUNCH') timestamp.setHours(13, 10, 0);
          else if (meal === 'SNACKS') timestamp.setHours(17, 0, 0);
          else timestamp.setHours(20, 20, 0);

          await prisma.messAttendance.create({
            data: {
              studentId: student.id,
              mealType: meal,
              date: dateStr,
              timestamp,
              verifiedBy: Math.random() > 0.5 ? 'BIOMETRIC_FINGERPRINT' : 'BIOMETRIC_FACE',
            },
          });
        }
      }
    }
  }

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
