const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MANIFEST_PATH = path.join(__dirname, '../uploads/admission_forms/manifest.json');
const DOCUMENTS_PATH = path.join(__dirname, '../student_documents.json');

async function linkDocs() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  let docs = [];
  if (fs.existsSync(DOCUMENTS_PATH)) {
    try {
      docs = JSON.parse(fs.readFileSync(DOCUMENTS_PATH, 'utf8'));
    } catch {
      docs = [];
    }
  }

  const students = await prisma.student.findMany({
    include: { user: true }
  });

  for (const item of manifest) {
    const student = students.find(s => s.phoneNumber === item.phone || s.user.name === item.name);
    if (!student) {
      console.warn(`Student not found for ${item.name} (${item.phone})`);
      continue;
    }

    // Remove any existing admission form for this student to prevent duplicates
    docs = docs.filter(d => !(d.studentId === student.id && d.docType === 'ADMISSION_FORM'));

    docs.push({
      id: `doc-admission-${student.id.slice(0, 8)}`,
      studentId: student.id,
      studentName: student.user.name,
      docType: 'ADMISSION_FORM',
      documentNumber: student.rollNumber,
      documentName: `Admission Form - ${student.user.name}`,
      fileUrl: item.fileUrl,
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'System Auto-Import',
      createdAt: student.dateOfJoining ? new Date(student.dateOfJoining).toISOString() : new Date().toISOString()
    });

    console.log(`✓ Linked Admission Form PDF for ${student.user.name} -> ${item.fileUrl}`);
  }

  fs.writeFileSync(DOCUMENTS_PATH, JSON.stringify(docs, null, 2));
  console.log(`\n🎉 Successfully linked all admission form documents in student_documents.json`);
  await prisma.$disconnect();
}

linkDocs().catch(console.error);
