const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testLogin(identifier, pass) {
  const allUsers = await prisma.user.findMany({
    include: { student: true, staff: true }
  });
  const rawEmail = identifier.trim().toLowerCase();
  let user = allUsers.find(u => u.email.trim().toLowerCase() === rawEmail);
  if (!user) {
    const cleanInput = rawEmail.replace(/\D/g, '');
    if (cleanInput.length >= 10) {
      user = allUsers.find(u => {
        const studentPhone = u.student?.phoneNumber?.replace(/\D/g, '');
        return studentPhone && (studentPhone === cleanInput || studentPhone.endsWith(cleanInput));
      });
    }
  }
  if (!user) {
    console.log('Login failed: user not found for', identifier);
    return;
  }
  const match = await bcrypt.compare(pass, user.password);
  console.log(`Login SUCCESS: identifier "${identifier}" => ${user.name} (${user.email}), password match: ${match}`);
}

async function run() {
  await testLogin('9351857108', 'password123'); // Archi Verma phone
  await testLogin('archi.verma@haripushppg.com', 'password123'); // Archi Verma email
  await testLogin('8082743215', 'password123'); // Shiun Tiku phone
  await testLogin('student@haripushppg.com', 'password123'); // Ria Dhanwani
  await prisma.$disconnect();
}

run();
