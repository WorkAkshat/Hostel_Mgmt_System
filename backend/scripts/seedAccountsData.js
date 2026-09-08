const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  console.log('🌱 Starting Excel Accounts Data Seed...');

  const accountHeadsData = [
    { code: 'ASSET-FURNITURE', name: 'Furniture & Fixtures Assets', group: 'ASSET', category: 'DIRECT' },
    { code: 'ASSET-ELECTRICAL', name: 'Electrical & Equipment Assets', group: 'ASSET', category: 'DIRECT' },
    { code: 'ASSET-PLUMBING', name: 'Plumbing & Hardware Assets', group: 'ASSET', category: 'DIRECT' },
    { code: 'ASSET-DECOR', name: 'Wall Decor & Paintings Assets', group: 'ASSET', category: 'DIRECT' },
    { code: 'ASSET-MACHINERY', name: 'Plant & Machinery (Water Coolers/AC/Fridges)', group: 'ASSET', category: 'DIRECT' },
    { code: 'EXP-COMMON-MAINT', name: 'Common Expenses & Maintenance', group: 'EXPENSE', category: 'INDIRECT' },
    { code: 'CASH-BANK', name: 'Cash / Bank Account', group: 'ASSET', category: 'DIRECT' }
  ];

  for (const ah of accountHeadsData) {
    await prisma.accountHead.upsert({
      where: { code: ah.code },
      update: ah,
      create: ah,
    });
  }
  console.log('✅ Account heads seeded.');

  const defaultHead = await prisma.accountHead.findUnique({ where: { code: 'ASSET-FURNITURE' } });
  const cashHead = await prisma.accountHead.findUnique({ where: { code: 'CASH-BANK' } });

  const rawData = JSON.parse(fs.readFileSync('/tmp/excel_extracted.json', 'utf8'));
  let count = 0;

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length < 4) continue;

    const srNo = row[0] || String(i);
    const itemDesc = row[1] || row[3] || 'Purchased Asset';
    const supplier = row[3] || row[6] || 'Vendor';
    const amountVal = parseFloat((row[4] || '0').replace(/[^0-9.]/g, '')) || 1000;
    const voucherNo = `VCH-IMP-2026-${String(i).padStart(4, '0')}`;

    try {
      await prisma.voucher.upsert({
        where: { voucherNo },
        update: {
          narration: `[Imported Excel Asset] ${itemDesc} - Supplier: ${supplier}`,
          amount: amountVal,
        },
        create: {
          voucherNo,
          voucherType: 'PAYMENT',
          date: new Date('2026-07-01'),
          floorNumber: null, // Common / Consolidated Asset
          companyName: supplier,
          narration: `[Imported Excel Asset] ${itemDesc} - Supplier: ${supplier}`,
          amount: amountVal,
          createdBy: 'admin@haripushp.com',
          entries: {
            create: [
              { accountHeadId: defaultHead.id, type: 'DEBIT', amount: amountVal },
              { accountHeadId: cashHead.id, type: 'CREDIT', amount: amountVal }
            ]
          }
        }
      });
      count++;
    } catch (e) {
      // Ignore duplicate
    }
  }

  console.log(`🎉 Successfully seeded ${count} voucher asset records from Excel file!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
