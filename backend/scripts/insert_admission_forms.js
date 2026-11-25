const { PrismaClient } = require('@prisma/client');
const { importAdmissionForms } = require('../services/admissionImportService');

const prisma = new PrismaClient();

async function main() {
  try {
    const results = await importAdmissionForms(prisma);
    console.log('\n--- Summary of Admitted Students ---');
    console.table(results);
  } catch (err) {
    console.error('Error importing forms:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
