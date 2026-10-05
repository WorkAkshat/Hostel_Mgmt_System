import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Building2, Phone, Mail, MapPin, Calendar, Zap, Home, UtensilsCrossed, CheckCircle, Clock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { priceFor } from '../config/hostel';

/* ─── Company data mirrored from backend/config/companyConfig.js ───── */
const COMPANY_CONFIG = {
  1: {
    companyName: 'Rajken Enterprises',
    hostelName: 'Hari Pushp Girls Hostel – First Floor',
    address: 'Hari Pushp Tower, Plot No. 10, First Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan – 302018',
    proprietorName: 'Kapil Sankhala',
    udyamRegNo: '',
    notePrefix: 'RJK',
  },
  2: {
    companyName: 'Vandana Enterprises',
    hostelName: 'Vandana Girls Hostel – Second Floor',
    address: 'Hari Pushp Tower, Plot No. 10, Second Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan – 302018',
    proprietorName: 'Vandana Sankhala',
    udyamRegNo: 'UDYAM-RJ-17-0654053',
    notePrefix: 'VAN',
  },
  3: {
    companyName: 'Pushpa Enterprises',
    hostelName: 'Pushpa Girls Hostel – Third Floor',
    address: 'Hari Pushp Tower, Plot No. 10, Third Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan – 302018',
    proprietorName: 'Pushpa Sankhala',
    udyamRegNo: 'UDYAM-RJ-17-0654175',
    notePrefix: 'PSH',
  },
  4: {
    companyName: 'Harish Chandra Enterprises',
    hostelName: 'Harish Chandra Girls Hostel – Fourth Floor',
    address: 'Hari Pushp Tower, Plot No. 10, Fourth Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan – 302018',
    proprietorName: 'Harish Chandra',
    udyamRegNo: 'UDYAM-RJ-17-0654078',
    notePrefix: 'HCE',
  },
  5: {
    companyName: 'Ramesh Enterprises',
    hostelName: 'Ramesh Girls Hostel – Fifth/Sixth Floor',
    address: 'Hari Pushp Tower, Plot No. 10, Fifth/Sixth Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan – 302018',
    proprietorName: 'Ramesh Sankhala',
    udyamRegNo: '',
    notePrefix: 'RME',
  },
};
const DEFAULT_COMPANY = {
  companyName: 'Hari Pushp Tower',
  hostelName: 'Hari Pushp Girls Hostel',
  address: 'Hari Pushp Tower, Plot No. 10, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan – 302018',
  proprietorName: 'Management',
  udyamRegNo: '',
};

const getCompany = (floorNumber) => COMPANY_CONFIG[floorNumber] || DEFAULT_COMPANY;

/* ─── Breakdown helper ─────────────────────────────────────────────── */
const getBreakdown = (invoice = {}) => {
  const total = Number(invoice.amount) || 0;

  // If specific components are stored on the invoice
  if (
    (invoice.rentAmount !== undefined && invoice.rentAmount !== null) ||
    (invoice.messAmount !== undefined && invoice.messAmount !== null) ||
    (invoice.electricityAmount !== undefined && invoice.electricityAmount !== null)
  ) {
    const rent = Number(invoice.rentAmount) || 0;
    const mess = Number(invoice.messAmount) || 0;
    const elec = Number(invoice.electricityAmount) || 0;
    const computedTotal = rent + mess + elec;
    return {
      rent,
      mess,
      elec,
      total: computedTotal > 0 ? computedTotal : total,
    };
  }

  const sharingType = invoice.student?.room?.sharingType;
  if (sharingType) {
    const p = priceFor(sharingType);
    const rent = p?.roomRent || 11000;
    const mess = p?.messFee || 3000;
    const elec = Math.max(0, total - rent - mess);
    return { rent, mess, elec, total: rent + mess + elec };
  }

  const rent = Math.round(total * 0.72);
  const mess = Math.round(total * 0.21);
  const elec = Math.max(0, total - rent - mess);
  return { rent, mess, elec, total };
};

/* ─── Billing month label ──────────────────────────────────────────── */
const billingPeriod = (invoice) => {
  const d = new Date(invoice.createdAt || Date.now());
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

/* ─── PDF Generator ────────────────────────────────────────────────── */
const generatePDF = (invoice) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.width;
  const brand = [36, 100, 96];
  const brandLight = [240, 248, 247];
  const gray = [71, 85, 105];
  const dark = [15, 23, 42];
  const light = [248, 250, 252];
  const borderCol = [203, 213, 225];

  const company = getCompany(invoice.student?.room?.floorNumber);
  const bd = getBreakdown(invoice);
  const invNo = `#INV-${String(invoice.id).split('-')[0].toUpperCase()}`;
  const student = invoice.student || {};
  const room = student.room || {};
  const isPaid = invoice.status === 'PAID';
  const period = billingPeriod(invoice);
  const sharingLabel = room.sharingType === 1 ? 'Single' : room.sharingType === 2 ? 'Twin' : room.sharingType === 3 ? 'Triple' : 'Standard';

  // 1. Header Bar
  doc.setFillColor(...brand);
  doc.rect(0, 0, pw, 42, 'F');

  doc.setFontSize(17); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(company.companyName, 14, 14);

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(215, 240, 238);
  doc.text(company.hostelName, 14, 20);

  const headerAddr = doc.splitTextToSize(company.address, pw - 88);
  headerAddr.slice(0, 2).forEach((l, i) => doc.text(l, 14, 25 + i * 5));
  if (company.udyamRegNo) {
    doc.text(`UDYAM Reg No: ${company.udyamRegNo}`, 14, 37);
  }

  // Header Right: Invoice Details
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pw - 14, 14, { align: 'right' });

  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  doc.text(invNo, pw - 14, 21, { align: 'right' });
  doc.text(`Issue: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN')}`, pw - 14, 27, { align: 'right' });
  doc.text(`Due: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}`, pw - 14, 33, { align: 'right' });

  // 2. Billing Period & Status Stamp
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark);
  doc.text(`Billing Period: ${period}`, 14, 50);

  doc.setFillColor(isPaid ? 34 : 239, isPaid ? 197 : 68, isPaid ? 94 : 68);
  doc.roundedRect(pw - 46, 44, 32, 9, 2, 2, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(isPaid ? 'PAID' : 'UNPAID', pw - 30, 50, { align: 'center' });

  // 3. Info Boxes (Billed To + Company Details)
  const boxY = 56;
  const boxW = (pw - 28) / 2 - 3;
  const boxH = 52;

  // Student Box (Left)
  doc.setFillColor(...light);
  doc.rect(14, boxY, boxW, boxH, 'F');
  doc.setDrawColor(...borderCol); doc.setLineWidth(0.3);
  doc.rect(14, boxY, boxW, boxH);

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...brand);
  doc.text('BILLED TO', 18, boxY + 7);

  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark);
  doc.text(student.user?.name || 'Student', 18, boxY + 14);

  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
  doc.text(`Roll No: ${student.rollNumber || 'N/A'}`, 18, boxY + 21);
  doc.text(`Room: ${room.roomNumber || 'N/A'}   ·   Floor: ${room.floorNumber || 'N/A'}`, 18, boxY + 27);
  doc.text(`Sharing: ${sharingLabel} Sharing`, 18, boxY + 33);
  doc.text(`Phone: ${student.phoneNumber || 'N/A'}`, 18, boxY + 39);
  doc.text(`Email: ${student.user?.email || 'N/A'}`, 18, boxY + 45);

  // Company Box (Right)
  const cx = 14 + boxW + 6;
  doc.setFillColor(...light);
  doc.rect(cx, boxY, boxW, boxH, 'F');
  doc.setDrawColor(...borderCol); doc.setLineWidth(0.3);
  doc.rect(cx, boxY, boxW, boxH);

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...brand);
  doc.text('COMPANY DETAILS', cx + 4, boxY + 7);

  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark);
  doc.text(company.companyName, cx + 4, boxY + 14);

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
  const companyAddr = doc.splitTextToSize(company.address, boxW - 8);
  companyAddr.slice(0, 3).forEach((l, i) => doc.text(l, cx + 4, boxY + 21 + i * 5));
  const afterAddrY = boxY + 21 + Math.min(companyAddr.length, 3) * 5 + 3;
  doc.text(`Proprietor: ${company.proprietorName}`, cx + 4, Math.min(afterAddrY, boxY + 39));
  if (company.udyamRegNo) {
    doc.text(`UDYAM: ${company.udyamRegNo}`, cx + 4, boxY + 45);
  }

  // 4. Line Items Table
  const rows = [
    ['1', `Room Rent & Accommodation\n(${sharingLabel} Sharing – ${period})`, `Rs. ${bd.rent.toLocaleString('en-IN')}`],
    ['2', 'Mess / Catering Charges\n(Meenakshi Enterprises – Monthly Charge)', `Rs. ${bd.mess.toLocaleString('en-IN')}`],
  ];
  if (bd.elec > 0) {
    rows.push(['3', 'Electricity & Utility Charges\n(Based on meter reading)', `Rs. ${bd.elec.toLocaleString('en-IN')}`]);
  }

  autoTable(doc, {
    startY: 114,
    head: [['#', 'Description', 'Amount (INR)']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: brand, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
    styles: { fontSize: 8.5, cellPadding: 4.5, textColor: dark },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 48, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: { fillColor: brandLight },
  });

  const fy = (doc.lastAutoTable?.finalY || 165) + 6;

  // 5. Totals & Payment Info
  doc.setDrawColor(...borderCol); doc.setLineWidth(0.3);
  doc.line(pw - 85, fy, pw - 14, fy);

  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
  doc.text('Subtotal:', pw - 82, fy + 7);
  doc.text('GST (Exempt):', pw - 82, fy + 14);

  doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark);
  doc.text(`Rs. ${bd.total.toLocaleString('en-IN')}`, pw - 16, fy + 7, { align: 'right' });
  doc.text('Rs. 0', pw - 16, fy + 14, { align: 'right' });

  // Total Banner Box
  doc.setFillColor(...brand);
  doc.rect(pw - 85, fy + 18, 71, 12, 'F');
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('Total:', pw - 80, fy + 26);
  doc.text(`Rs. ${bd.total.toLocaleString('en-IN')}`, pw - 18, fy + 26, { align: 'right' });

  // Payment Note on Left
  if (isPaid && invoice.paidAt) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74);
    doc.text(`Payment received on: ${new Date(invoice.paidAt).toLocaleDateString('en-IN')}`, 14, fy + 22);
  } else {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(220, 38, 38);
    doc.text(`Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}`, 14, fy + 22);
  }

  // 6. Signatory
  const sy = fy + 46;
  doc.setDrawColor(180, 200, 198); doc.setLineWidth(0.4);
  doc.line(pw - 70, sy, pw - 14, sy);

  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
  doc.text('Authorised Signatory', pw - 42, sy + 6, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark);
  doc.text(company.proprietorName, pw - 42, sy + 11, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray); doc.setFontSize(8);
  doc.text(company.companyName, pw - 42, sy + 16, { align: 'center' });

  // 7. Footer
  doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 150, 160);
  doc.text(
    'This is a computer-generated tax invoice issued by Hari Pushp Hostel Management System. No physical signature required if paid online.',
    pw / 2,
    285,
    { align: 'center' }
  );

  doc.save(`Invoice_${String(student.rollNumber || 'student').replace(/[^a-z0-9]/gi, '_')}_${invNo.replace('#', '')}.pdf`);
};

/* ─── Invoice Preview Modal ────────────────────────────────────────── */
const InvoicePreviewModal = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const company = getCompany(invoice.student?.room?.floorNumber);
  const bd = getBreakdown(invoice);
  const student = invoice.student || {};
  const room = student.room || {};
  const isPaid = invoice.status === 'PAID';
  const invNo = `#INV-${String(invoice.id).split('-')[0].toUpperCase()}`;
  const period = billingPeriod(invoice);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#1b2a29]/70 backdrop-blur-xs"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: '#fff' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white shadow border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <X size={17} />
        </button>

        {/* ─── Invoice Header ─── */}
        <div
          className="rounded-t-2xl p-6 pb-5"
          style={{ background: 'linear-gradient(135deg, #246460 0%, #2b7a74 50%, #3a918a 100%)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={18} style={{ color: 'rgba(255,255,255,0.8)' }} />
                <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.65)' }}>Tax Invoice</span>
              </div>
              <h2 className="text-[20px] font-bold m-0" style={{ color: '#fff' }}>{company.companyName}</h2>
              <p className="text-[12px] m-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>{company.hostelName}</p>
              <p className="text-[11px] m-0 mt-1 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <MapPin size={11} /> {company.address}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-[13px] font-bold mb-1" style={{ color: '#fff' }}>{invNo}</div>
              <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Issued: {new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN')}
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}
              </div>
              <div className="mt-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                  style={{
                    background: isPaid ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
                    color: isPaid ? '#bbf7d0' : '#fecaca',
                    border: `1px solid ${isPaid ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  }}
                >
                  {isPaid ? <CheckCircle size={11} /> : <Clock size={11} />}
                  {isPaid ? 'PAID' : 'UNPAID'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 text-[12px] font-semibold flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)' }}>
            <Calendar size={13} />
            Billing Period: {period}
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* ─── Student + Company info cards ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student */}
            <div className="rounded-xl border border-[var(--border-color)] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand-700 mb-3">Billed To</div>
              <div className="font-bold text-[15px]">{student.user?.name || 'Student'}</div>
              <div className="text-[12px] text-[var(--text-tertiary)] font-mono mt-0.5">{student.rollNumber || 'N/A'}</div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                  <Home size={12} className="text-brand-600 shrink-0" />
                  Room {room.roomNumber || 'N/A'} · Floor {room.floorNumber || 'N/A'} ·{' '}
                  {room.sharingType === 1 ? 'Single' : room.sharingType === 2 ? 'Twin' : room.sharingType === 3 ? 'Triple' : '—'} sharing
                </div>
                {student.phoneNumber && (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <Phone size={12} className="text-brand-600 shrink-0" /> {student.phoneNumber}
                  </div>
                )}
                {student.user?.email && (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <Mail size={12} className="text-brand-600 shrink-0" /> {student.user.email}
                  </div>
                )}
              </div>
            </div>

            {/* Company */}
            <div className="rounded-xl border border-[var(--border-color)] p-4" style={{ background: '#f3faf9' }}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand-700 mb-3">Billing Entity</div>
              <div className="font-bold text-[13px]">{company.companyName}</div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{company.hostelName}</div>
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
                  <MapPin size={11} className="text-brand-600 shrink-0 mt-0.5" />
                  {company.address}
                </div>
                {company.udyamRegNo && (
                  <div className="text-[11px] text-[var(--text-tertiary)]">UDYAM: {company.udyamRegNo}</div>
                )}
                <div className="text-[11px] text-[var(--text-secondary)]">Proprietor: <span className="font-semibold">{company.proprietorName}</span></div>
              </div>
            </div>
          </div>

          {/* ─── Fee breakdown table ─── */}
          <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-700"
              style={{ background: 'linear-gradient(90deg, #f0f8f7, #fff)' }}>
              Fee Breakdown
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#f3faf9' }}>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-[var(--text-secondary)]">#</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-[var(--text-secondary)]">Description</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-bold text-[var(--text-secondary)]">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">1</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f0f8f7' }}>
                        <Home size={13} style={{ color: '#246460' }} />
                      </span>
                      <div>
                        <div className="font-semibold text-[13px]">Room Rent & Accommodation</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          {room.sharingType === 1 ? 'Single' : room.sharingType === 2 ? 'Twin' : 'Triple'} Sharing · {period}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[14px]">₹{bd.rent.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">2</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#fff6f0' }}>
                        <UtensilsCrossed size={13} style={{ color: '#9c4623' }} />
                      </span>
                      <div>
                        <div className="font-semibold text-[13px]">Mess / Catering</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">Meenakshi Enterprises · Monthly Charge</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[14px]">₹{bd.mess.toLocaleString('en-IN')}</td>
                </tr>
                {bd.elec > 0 && (
                  <tr className="border-t border-[var(--border-color)]">
                    <td className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">3</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#fefce8' }}>
                          <Zap size={13} style={{ color: '#a16207' }} />
                        </span>
                        <div>
                          <div className="font-semibold text-[13px]">Electricity & Utility Charges</div>
                          <div className="text-[11px] text-[var(--text-tertiary)]">Based on meter reading @ ₹12/unit</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[14px]">₹{bd.elec.toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: 'linear-gradient(135deg, #246460, #3a918a)' }}>
                  <td colSpan={2} className="px-4 py-3 font-bold text-[13px]" style={{ color: '#fff' }}>Total Amount</td>
                  <td className="px-4 py-3 text-right font-bold text-[18px]" style={{ color: '#fff' }}>
                    ₹{bd.total.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ─── Payment details ─── */}
          <div className={`rounded-xl p-4 border ${isPaid ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: isPaid ? '#166534' : '#991b1b' }}>
              Payment Details
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px]" style={{ color: isPaid ? '#166534' : '#991b1b' }}>
                {isPaid ? <CheckCircle size={15} /> : <Clock size={15} />}
                <span className="font-semibold">{isPaid ? 'Payment Received' : 'Payment Pending'}</span>
              </div>
              {isPaid && invoice.paidAt && (
                <span className="text-[12px] font-medium" style={{ color: '#166534' }}>
                  {new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {!isPaid && (
                <span className="text-[12px] font-medium text-red-600">
                  Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              )}
            </div>
          </div>

          {/* ─── Signature ─── */}
          <div className="flex justify-end">
            <div className="text-center">
              <div className="w-40 border-b-2 border-gray-300 mb-1 mt-6" />
              <div className="text-[11px] font-bold text-[var(--text-secondary)]">Authorised Signatory</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">{company.proprietorName}</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">{company.companyName}</div>
            </div>
          </div>

          <p className="text-[10px] text-[var(--text-tertiary)] text-center m-0">
            Computer-generated invoice · Hari Pushp Hostel Management System · No physical signature required if paid online
          </p>

          {/* ─── Download button ─── */}
          <button
            onClick={() => generatePDF(invoice)}
            className="w-full h-12 rounded-[var(--border-radius-btn)] font-bold text-[14px] flex items-center justify-center gap-2.5 cursor-pointer border-none transition-all"
            style={{ background: 'linear-gradient(135deg, #246460, #3a918a)', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Download size={17} /> Download PDF Invoice
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export { generatePDF, getBreakdown };
export default InvoicePreviewModal;
