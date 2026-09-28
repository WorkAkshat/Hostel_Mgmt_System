const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Allow passing target DATABASE_URL as an argument or from .env
const targetDbUrl = process.argv[2] || process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;

if (!targetDbUrl) {
  console.error('Error: No target DATABASE_URL provided.');
  console.error('Usage: node scripts/restoreToLocal.js "postgresql://user:pass@localhost:5432/dbname?schema=public"');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: targetDbUrl,
    },
  },
});

async function restoreDatabase() {
  const backupFile = path.resolve(__dirname, '../backups/db_backup_latest.json');
  if (!fs.existsSync(backupFile)) {
    console.error(`Error: Backup file not found at: ${backupFile}`);
    console.error('Please run "npm run db:backup" first.');
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  console.log(`\n============================================================`);
  console.log(`📥 Restoring Backup to Database: ${targetDbUrl.split('@')[1] || 'Target DB'}`);
  console.log(`📅 Backup Timestamp: ${backupData.metadata?.generatedAt || 'N/A'}`);
  console.log(`============================================================\n`);

  const models = [
    { name: 'User', accessor: prisma.user },
    { name: 'Floor', accessor: prisma.floor },
    { name: 'Room', accessor: prisma.room },
    { name: 'Staff', accessor: prisma.staff },
    { name: 'Student', accessor: prisma.student },
    { name: 'LeaveRequest', accessor: prisma.leaveRequest },
    { name: 'Complaint', accessor: prisma.complaint },
    { name: 'Suggestion', accessor: prisma.suggestion },
    { name: 'Invoice', accessor: prisma.invoice },
    { name: 'DemandNote', accessor: prisma.demandNote },
    { name: 'ElectricityReading', accessor: prisma.electricityReading },
    { name: 'NightAttendance', accessor: prisma.nightAttendance },
    { name: 'Visitor', accessor: prisma.visitor },
    { name: 'Notice', accessor: prisma.notice },
    { name: 'MessMenu', accessor: prisma.messMenu },
    { name: 'Poll', accessor: prisma.poll },
    { name: 'PollVote', accessor: prisma.pollVote },
    { name: 'AccountHead', accessor: prisma.accountHead },
    { name: 'Voucher', accessor: prisma.voucher },
    { name: 'VoucherEntry', accessor: prisma.voucherEntry },
    { name: 'ActivityLog', accessor: prisma.activityLog },
  ];

  let totalRestored = 0;

  for (const model of models) {
    const records = backupData.tables[model.name] || [];
    if (records.length === 0) continue;

    let restoredCount = 0;
    for (const record of records) {
      try {
        // Convert date strings back to Date objects if needed
        const parsedRecord = { ...record };
        for (const [key, value] of Object.entries(parsedRecord)) {
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            parsedRecord[key] = new Date(value);
          }
        }

        // Upsert record using primary key
        if (parsedRecord.id) {
          await model.accessor.upsert({
            where: { id: parsedRecord.id },
            update: parsedRecord,
            create: parsedRecord,
          });
          restoredCount++;
        } else if (parsedRecord.code && model.name === 'AccountHead') {
          await model.accessor.upsert({
            where: { code: parsedRecord.code },
            update: parsedRecord,
            create: parsedRecord,
          });
          restoredCount++;
        } else {
          await model.accessor.create({ data: parsedRecord });
          restoredCount++;
        }
      } catch (err) {
        // Ignore unique constraint collisions if record already exists
        if (!err.message?.includes('Unique constraint')) {
          console.warn(`  ⚠️ Failed to restore record in ${model.name}:`, err.message);
        }
      }
    }
    console.log(`  ✓ Restored ${model.name.padEnd(20)} : ${restoredCount} / ${records.length} records`);
    totalRestored += restoredCount;
  }

  console.log(`\n============================================================`);
  console.log(`🎉 Database Restore Completed Successfully!`);
  console.log(`📊 Total Records Restored: ${totalRestored}`);
  console.log(`============================================================\n`);

  await prisma.$disconnect();
}

if (require.main === module) {
  restoreDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal restore error:', err);
      process.exit(1);
    });
}

module.exports = { restoreDatabase };
