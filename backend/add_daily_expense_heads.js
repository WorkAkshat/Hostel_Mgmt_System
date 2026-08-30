/**
 * One-time script to add new Daily Expense heads to an existing database
 * without re-seeding all data.
 * 
 * Run: node add_daily_expense_heads.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newHeads = [
  { code: 'EXP-CLEANING',     name: 'Cleaning Supplies & Housekeeping', group: 'EXPENSE', category: 'DIRECT' },
  { code: 'EXP-PETTY-CASH',   name: 'Petty Cash / Miscellaneous',       group: 'EXPENSE', category: 'INDIRECT' },
  { code: 'EXP-WATER',        name: 'Water Supply & Tanker Charges',    group: 'EXPENSE', category: 'DIRECT' },
  { code: 'EXP-TRANSPORT',    name: 'Transport & Travel Expenses',      group: 'EXPENSE', category: 'INDIRECT' },
  { code: 'EXP-STATIONERY',   name: 'Stationery & Office Supplies',     group: 'EXPENSE', category: 'INDIRECT' },
  { code: 'EXP-INTERNET',     name: 'Internet / WiFi & Telecom',        group: 'EXPENSE', category: 'INDIRECT' },
  { code: 'EXP-PEST-CONTROL', name: 'Pest Control & Fumigation',        group: 'EXPENSE', category: 'DIRECT' },
  { code: 'EXP-KITCHEN',      name: 'Kitchen & Pantry Supplies',        group: 'EXPENSE', category: 'DIRECT' },
];

async function main() {
  let added = 0;
  let skipped = 0;

  for (const head of newHeads) {
    const existing = await prisma.accountHead.findUnique({ where: { code: head.code } });
    if (existing) {
      console.log(`  ⏭ Skipped (already exists): ${head.code} — ${head.name}`);
      skipped++;
    } else {
      await prisma.accountHead.create({ data: head });
      console.log(`  ✅ Created: ${head.code} — ${head.name}`);
      added++;
    }
  }

  console.log(`\n✓ Done! Added ${added} new heads, skipped ${skipped} existing.`);
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
