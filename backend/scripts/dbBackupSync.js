const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.production first if present, otherwise .env
const prodEnvPath = path.resolve(__dirname, '../.env.production');
const defaultEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(prodEnvPath)) {
  dotenv.config({ path: prodEnvPath });
  console.log(`[Backup] Loaded environment from: .env.production`);
} else {
  dotenv.config({ path: defaultEnvPath });
  console.log(`[Backup] Loaded environment from: .env`);
}

const prisma = new PrismaClient();

const escapeSql = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
};

async function backupDatabase() {
  console.log(`[Backup] Connecting to database: ${process.env.DATABASE_URL?.split('@')[1] || 'PostgreSQL'}...`);
  const startTime = Date.now();

  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceDatabase: process.env.DATABASE_URL?.split('@')[1] || 'PostgreSQL',
      version: '1.0.0',
    },
    tables: {},
  };

  const sqlStatements = [
    `-- ============================================================`,
    `-- Hari Pushp PG Database Backup`,
    `-- Generated At: ${new Date().toISOString()}`,
    `-- Source: ${process.env.DATABASE_URL?.split('@')[1] || 'Production'}`,
    `-- ============================================================`,
    `BEGIN;`,
    ``
  ];

  // Ordered list of models respecting foreign key dependencies
  const models = [
    { name: 'User', accessor: prisma.user, tableName: 'User' },
    { name: 'Floor', accessor: prisma.floor, tableName: 'Floor' },
    { name: 'Room', accessor: prisma.room, tableName: 'Room' },
    { name: 'Staff', accessor: prisma.staff, tableName: 'Staff' },
    { name: 'Student', accessor: prisma.student, tableName: 'Student' },
    { name: 'LeaveRequest', accessor: prisma.leaveRequest, tableName: 'LeaveRequest' },
    { name: 'Complaint', accessor: prisma.complaint, tableName: 'Complaint' },
    { name: 'Suggestion', accessor: prisma.suggestion, tableName: 'Suggestion' },
    { name: 'Invoice', accessor: prisma.invoice, tableName: 'Invoice' },
    { name: 'DemandNote', accessor: prisma.demandNote, tableName: 'DemandNote' },
    { name: 'ElectricityReading', accessor: prisma.electricityReading, tableName: 'ElectricityReading' },
    { name: 'NightAttendance', accessor: prisma.nightAttendance, tableName: 'NightAttendance' },
    { name: 'Visitor', accessor: prisma.visitor, tableName: 'Visitor' },
    { name: 'Notice', accessor: prisma.notice, tableName: 'Notice' },
    { name: 'MessMenu', accessor: prisma.messMenu, tableName: 'MessMenu' },
    { name: 'Poll', accessor: prisma.poll, tableName: 'Poll' },
    { name: 'PollVote', accessor: prisma.pollVote, tableName: 'PollVote' },
    { name: 'AccountHead', accessor: prisma.accountHead, tableName: 'AccountHead' },
    { name: 'Voucher', accessor: prisma.voucher, tableName: 'Voucher' },
    { name: 'VoucherEntry', accessor: prisma.voucherEntry, tableName: 'VoucherEntry' },
    { name: 'ActivityLog', accessor: prisma.activityLog, tableName: 'ActivityLog' },
  ];

  let totalRecords = 0;

  for (const model of models) {
    try {
      const records = await model.accessor.findMany();
      backupData.tables[model.name] = records;
      totalRecords += records.length;
      console.log(`  ✓ ${model.name.padEnd(20)} : ${records.length} records`);

      if (records.length > 0) {
        sqlStatements.push(`-- Table: ${model.tableName} (${records.length} records)`);
        for (const record of records) {
          const keys = Object.keys(record);
          const cols = keys.map(k => `"${k}"`).join(', ');
          const values = keys.map(k => escapeSql(record[k])).join(', ');
          sqlStatements.push(`INSERT INTO "${model.tableName}" (${cols}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
        }
        sqlStatements.push(``);
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not export ${model.name}: ${err.message}`);
    }
  }

  sqlStatements.push(`COMMIT;`);

  // Write JSON backup (latest + timestamped)
  const jsonLatestPath = path.join(backupDir, 'db_backup_latest.json');
  const jsonTimestampPath = path.join(backupDir, `db_backup_${timestamp}.json`);
  fs.writeFileSync(jsonLatestPath, JSON.stringify(backupData, null, 2), 'utf8');
  fs.writeFileSync(jsonTimestampPath, JSON.stringify(backupData, null, 2), 'utf8');

  // Write SQL backup (latest + timestamped)
  const sqlLatestPath = path.join(backupDir, 'db_backup_latest.sql');
  const sqlTimestampPath = path.join(backupDir, `db_backup_${timestamp}.sql`);
  fs.writeFileSync(sqlLatestPath, sqlStatements.join('\n'), 'utf8');
  fs.writeFileSync(sqlTimestampPath, sqlStatements.join('\n'), 'utf8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n============================================================`);
  console.log(`🎉 Database Backup Completed Successfully in ${elapsed}s!`);
  console.log(`📊 Total Records Exported: ${totalRecords}`);
  console.log(`📁 JSON Backup: ${jsonLatestPath}`);
  console.log(`📁 SQL Backup : ${sqlLatestPath}`);
  console.log(`============================================================\n`);

  await prisma.$disconnect();
  return { totalRecords, jsonLatestPath, sqlLatestPath };
}

if (require.main === module) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal backup error:', err);
      process.exit(1);
    });
}

module.exports = { backupDatabase };
