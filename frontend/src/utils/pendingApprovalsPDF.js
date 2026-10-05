import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates and downloads a comprehensive PDF report of all students pending admission approval.
 * @param {Array} pendingUsers - Array of pending user objects from auth API
 */
export const downloadPendingStudentsPDF = (pendingUsers = []) => {
  const pendingStudents = pendingUsers.filter((u) => {
    const role = (u.role || '').replace('PENDING_', '');
    return role === 'STUDENT' || (!role && u.student);
  });

  if (pendingStudents.length === 0) {
    alert('No pending student registrations available to export.');
    return;
  }

  // Create A4 Landscape document for detailed tabular layout
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // --- Header Function for Pages ---
  const drawHeader = () => {
    // Brand header background banner
    doc.setFillColor(36, 100, 96); // Brand Teal #246460
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Brand accent line
    doc.setFillColor(249, 215, 126); // Brand Gold #f9d77e
    doc.rect(0, 22, pageWidth, 2, 'F');

    // Hostel Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('HARI PUSHP PG GIRLS HOSTEL', 14, 11);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(230, 244, 242);
    doc.text('Executive Residences & Student Accommodations | Admin Approvals Division', 14, 17);

    // Right-side badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('PENDING ADMISSIONS DOSSIER', pageWidth - 14, 11, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(230, 244, 242);
    doc.text(`Generated: ${todayStr} at ${timeStr} | Total Pending: ${pendingStudents.length}`, pageWidth - 14, 17, { align: 'right' });
  };

  drawHeader();

  // Subtitle banner on page 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(27, 42, 41);
  doc.text('MASTER LIST OF STUDENTS AWAITING ADMISSION & ROOM ALLOCATION APPROVAL', 14, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(82, 98, 95);
  doc.text('The following student residents have registered through the admission portal and require administrative review, background check, and room allotment.', 14, 37);

  // --- 1. Master Tabular Summary ---
  const tableRows = pendingStudents.map((u, idx) => {
    const s = u.student || {};
    const appliedDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    const joiningDate = s.dateOfJoining ? new Date(s.dateOfJoining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    const dob = s.dob ? new Date(s.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    return [
      idx + 1,
      `${u.name || 'N/A'}\n${u.email || ''}`,
      `Ph: ${s.phoneNumber || 'N/A'}\nParent: ${s.parentContact || 'N/A'}`,
      `Father: ${s.fatherName || 'N/A'}\nMother: ${s.motherName || 'N/A'} (${s.motherContact || '-'})`,
      `${s.coachingCollege || 'N/A'}`,
      `${s.permanentAddress || 'N/A'}\nState: ${s.state || 'N/A'} - ${s.pincode || ''}`,
      `DOB: ${dob}\nBlood: ${s.bloodGroup || 'N/A'} | ${s.maritalStatus || 'Unmarried'}`,
      `Joining: ${joiningDate}\nEmergency: ${s.emergencyContact || 'N/A'}`,
      appliedDate,
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [[
      '#',
      'Student Name & Email',
      'Contact Numbers',
      'Parents Details',
      'College / Institute / Org',
      'Permanent Address',
      'Personal Details',
      'Joining & Emergency',
      'Applied On',
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
      textColor: [27, 42, 41],
      lineColor: [207, 220, 217],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [36, 100, 96],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { cellWidth: 38 },
      4: { cellWidth: 35 },
      5: { cellWidth: 40 },
      6: { cellWidth: 28 },
      7: { cellWidth: 32 },
      8: { cellWidth: 20, halign: 'center' },
    },
    didDrawPage: () => {
      drawHeader();
    },
    margin: { top: 28, left: 14, right: 14, bottom: 20 },
  });

  // --- 2. Detailed Itemized Student Profile Sheets ---
  // Start on new page for clear dossier profiles
  doc.addPage();
  drawHeader();

  let curY = 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(27, 42, 41);
  doc.text('DETAILED STUDENT ADMISSION DOSSIERS & VERIFICATION FORMS', 14, curY);
  curY += 7;

  pendingStudents.forEach((u, index) => {
    const s = u.student || {};
    const appliedDate = u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';
    const joiningDate = s.dateOfJoining
      ? new Date(s.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';
    const dob = s.dob
      ? new Date(s.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';

    const cardHeight = 52;

    // Check if card fits on current page
    if (curY + cardHeight > pageHeight - 20) {
      doc.addPage();
      drawHeader();
      curY = 32;
    }

    // Student Card Container Box
    doc.setFillColor(246, 250, 249); // Mint surface #f6faf9
    doc.setDrawColor(207, 220, 217);
    doc.roundedRect(14, curY, pageWidth - 28, cardHeight, 2, 2, 'FD');

    // Card Title Bar
    doc.setFillColor(230, 244, 242);
    doc.rect(14, curY, pageWidth - 28, 7.5, 'F');
    doc.setDrawColor(207, 220, 217);
    doc.line(14, curY + 7.5, pageWidth - 14, curY + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(36, 100, 96);
    doc.text(`[ #${index + 1} ]  ${(u.name || 'Unknown Student').toUpperCase()}`, 18, curY + 5.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 98, 95);
    doc.text(`Email: ${u.email || 'N/A'}  |  Applied: ${appliedDate}  |  Status: Pending Admin Approval`, pageWidth - 18, curY + 5.2, { align: 'right' });

    // Grid Column 1: Personal & Contact
    const col1X = 18;
    const lineY1 = curY + 12.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(27, 42, 41);
    doc.text('Personal & Student Contact:', col1X, lineY1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(82, 98, 95);
    doc.text(`Student Mobile: `, col1X, lineY1 + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 41);
    doc.text(`${s.phoneNumber || 'N/A'}`, col1X + 22, lineY1 + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 98, 95);
    doc.text(`Date of Birth: ${dob}  |  Blood: ${s.bloodGroup || 'O+'}`, col1X, lineY1 + 8.5);
    doc.text(`Marital Status: ${s.maritalStatus || 'Unmarried'}`, col1X, lineY1 + 12.5);
    doc.text(`Joining Date: ${joiningDate}`, col1X, lineY1 + 16.5);

    // Grid Column 2: Family & Guardians
    const col2X = col1X + 70;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(27, 42, 41);
    doc.text('Parent & Family Details:', col2X, lineY1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(82, 98, 95);
    doc.text(`Father Name: `, col2X, lineY1 + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 41);
    doc.text(`${s.fatherName || 'N/A'}`, col2X + 18, lineY1 + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 98, 95);
    doc.text(`Parent / Emergency: `, col2X, lineY1 + 8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 41);
    doc.text(`${s.parentContact || 'N/A'}`, col2X + 26, lineY1 + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 98, 95);
    doc.text(`Mother: ${s.motherName || 'N/A'} (${s.motherContact || '-'})`, col2X, lineY1 + 12.5);
    doc.text(`Sibling Contact: ${s.siblingContact || 'N/A'}`, col2X, lineY1 + 16.5);

    // Grid Column 3: Academic, Address & Allocation
    const col3X = col2X + 80;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(27, 42, 41);
    doc.text('Institute & Permanent Address:', col3X, lineY1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(82, 98, 95);
    doc.text(`College / Org: `, col3X, lineY1 + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 41);
    doc.text(`${s.coachingCollege || 'N/A'}`, col3X + 19, lineY1 + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 98, 95);
    doc.text(`Address: ${s.permanentAddress || 'N/A'}`, col3X, lineY1 + 8.5);
    doc.text(`State & PIN: ${s.state || 'N/A'} - ${s.pincode || 'N/A'}`, col3X, lineY1 + 12.5);
    doc.text(`Emergency Person: ${s.emergencyContact || 'N/A'}`, col3X, lineY1 + 16.5);

    // Grid Column 4: Admin Verification Box
    const col4X = pageWidth - 60;
    doc.setDrawColor(207, 220, 217);
    doc.setFillColor(255, 255, 255);
    doc.rect(col4X, curY + 10, 42, 36, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(36, 100, 96);
    doc.text('ADMIN DECISION', col4X + 21, curY + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(82, 98, 95);
    doc.text('[  ] Approved', col4X + 4, curY + 19);
    doc.text('[  ] Rejected', col4X + 4, curY + 23);
    doc.text('Floor / Room: ________', col4X + 4, curY + 28);
    doc.text('Sign: ________________', col4X + 4, curY + 34);

    curY += cardHeight + 4.5;
  });

  // --- Add Page Numbers & Official Footer to All Pages ---
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(207, 220, 217);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(138, 152, 149);
    doc.text('Hari Pushp Tower Girls Hostel &bull; Confidential &bull; For Internal Administrative & Warden Use Only', 14, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }

  // Save the PDF file
  const filename = `HariPushpPG_Pending_Students_Approvals_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
