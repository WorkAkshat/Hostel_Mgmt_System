import { useMemo, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import FilterChips from '../../components/ui/FilterChips';
import { fmtDate } from '../../utils/format';
import { invoiceNumber, monthKey, monthLabel, noteDueDate, numberToWords } from './financeUtils';

// Printable fee documents (invoice receipts and 10-to-10 demand notes).
// The sheet uses its own small stylesheet so the same markup prints cleanly
// from a hidden iframe, independent of the app's Tailwind styles.
const DOC_CSS = `
.bd-sheet{font-family:'Inter',Arial,sans-serif;color:#1d2a27;background:#fff;border:1px solid #d9e6e3;border-radius:14px;padding:28px;margin:0 auto 20px;max-width:760px;font-size:12px;line-height:1.5}
.bd-top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #1d2a27;padding-bottom:14px}
.bd-hostel{font-size:19px;font-weight:800;letter-spacing:.2px;margin:0}
.bd-run{font-size:12px;font-weight:600;margin:2px 0 4px}
.bd-muted{color:#5b6b67}
.bd-small{font-size:10.5px}
.bd-kind{text-align:right;white-space:nowrap}
.bd-kind h2{font-size:15px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 6px}
.bd-kv{display:grid;grid-template-columns:auto auto;gap:1px 10px;justify-content:end;font-size:11px}
.bd-kv span:nth-child(odd){color:#5b6b67;text-align:right}
.bd-kv span:nth-child(even){font-weight:600}
.bd-reg{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:10px;font-size:10.5px;color:#5b6b67}
.bd-to{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;background:#f3faf8;border-radius:10px;padding:12px 14px;margin:16px 0}
.bd-to b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#5b6b67;font-weight:600}
.bd-table{width:100%;border-collapse:collapse;margin:4px 0 0}
.bd-table th{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#5b6b67;text-align:left;border-bottom:1px solid #1d2a27;padding:6px 8px}
.bd-table td{padding:9px 8px;border-bottom:1px solid #e3ecea;vertical-align:top}
.bd-table .r{text-align:right;white-space:nowrap}
.bd-total{display:flex;justify-content:space-between;align-items:center;border-top:2px solid #1d2a27;margin-top:2px;padding:10px 8px 0;font-size:14px;font-weight:800}
.bd-words{font-style:italic;color:#5b6b67;padding:2px 8px 0;font-size:11px}
.bd-foot{display:flex;justify-content:space-between;gap:24px;margin-top:22px;align-items:flex-end}
.bd-notes{font-size:10.5px;color:#3e4d49;max-width:430px}
.bd-notes p{margin:0 0 3px}
.bd-sign{text-align:right;font-size:11px}
.bd-sign .line{border-top:1px solid #1d2a27;padding-top:4px;margin-top:34px;min-width:190px}
.bd-stamp{display:inline-block;border:2px solid #2f8a5b;color:#2f8a5b;border-radius:8px;padding:4px 12px;font-weight:800;letter-spacing:2px;transform:rotate(-4deg);font-size:13px}
.bd-due{display:inline-block;background:#fff4d6;color:#7a5200;border-radius:8px;padding:4px 10px;font-weight:700;font-size:11px}
.bd-cc{text-align:center;color:#8a9894;font-size:9.5px;margin-top:16px}
@media print{body{margin:0}.bd-sheet{border:none;border-radius:0;padding:10mm 12mm;max-width:none;margin:0;page-break-after:always}.bd-sheet:last-child{page-break-after:auto}}
`;

const FALLBACK_COMPANY = { hostelName: 'Hari Pushp Hostel', companyName: '', address: 'Hari Pushp Tower, Plot No. 10, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018' };

const money = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const HOW_TO_PAY = 'Pay at the hostel office in cash, by UPI or by bank transfer. Ask the warden for the account details and keep your transaction reference.';

// ---------- sheet builders ----------

export const invoiceSheets = (inv, config) => {
  const room = inv.student?.room;
  const floor = inv.floorNumber || room?.floorNumber;
  const company = config?.companies?.[floor] || FALLBACK_COMPANY;
  const fees = config?.fees;
  const sharing = room?.sharingType || room?.capacity;
  const rent = fees?.hostel?.[sharing];
  const mess = fees?.mess;
  const period = monthLabel(monthKey(inv.createdAt));

  // Show the rent / catering split only when the amount is exactly the standard fee
  const lines = rent && mess && Math.round(inv.amount) === rent + mess
    ? [
        { label: 'Hostel accommodation', detail: `${sharing}-sharing room · ${period}`, amount: rent },
        { label: 'Food & catering', detail: `${config?.companies?.catering?.companyName || 'Catering'} · ${period}`, amount: mess },
      ]
    : [{ label: 'Hostel fee', detail: period, amount: inv.amount }];

  return [{
    key: 'invoice',
    title: 'Fee invoice',
    number: invoiceNumber(inv),
    issued: inv.createdAt,
    due: inv.dueDate,
    period,
    company,
    resident: residentOf(inv.student, company),
    lines,
    total: inv.amount,
    paidAt: inv.status === 'PAID' ? inv.paidAt : null,
    notes: [
      company.companyName && `This invoice is for hostel services provided by ${company.companyName}.`,
      fees?.lateFeePerDay && `A late fee of ₹${fees.lateFeePerDay} per day applies after the due date.`,
    ].filter(Boolean),
  }];
};

export const demandSheets = (note, config) => {
  const company = note.company || config?.companies?.[note.floorNumber] || FALLBACK_COMPANY;
  const catering = note.catering || config?.companies?.catering || FALLBACK_COMPANY;
  const fees = config?.fees;
  const period = `${fmtDate(note.cycleStart, { year: 'numeric' })} – ${fmtDate(note.cycleEnd, { year: 'numeric' })}`;
  const due = noteDueDate(note);
  const paidAt = note.status === 'PAID' ? note.paidAt : null;
  const hostelTotal = (note.hostelFee || 0) + (note.electricityAmount || 0) + (note.otherCharges || 0);
  const resident = residentOf(note.student, company);
  const lateFee = fees?.lateFeePerDay && `A late fee of ₹${fees.lateFeePerDay} per day applies after the due date.`;

  const hostelLines = [
    { label: 'Hostel accommodation', detail: `Includes maintenance, security & amenities · ${period}`, amount: note.hostelFee },
    {
      label: 'Electricity',
      detail: note.electricityUnits ? `${note.electricityUnits} units × ₹${Number(note.electricityRate).toFixed(2)} (your share of the room meter)` : 'No meter reading this cycle',
      amount: note.electricityAmount,
    },
  ];
  if (note.otherCharges) hostelLines.push({ label: 'Other charges', detail: '', amount: note.otherCharges });

  return [
    {
      key: 'hostel',
      title: 'Demand note',
      subtitle: 'Hostel accommodation',
      number: note.noteNumber,
      issued: note.createdAt,
      due,
      period,
      company,
      resident,
      lines: hostelLines,
      total: hostelTotal,
      paidAt,
      notes: [`Hostel fee is payable in advance for the cycle ${period}.`, lateFee].filter(Boolean),
    },
    {
      key: 'catering',
      title: 'Demand note',
      subtitle: 'Food & catering',
      number: note.noteNumber ? note.noteNumber.replace(/^[A-Z]+/, catering.notePrefix || 'ME') : '',
      issued: note.createdAt,
      due,
      period,
      company: { ...catering, hostelName: catering.companyName, companyName: '' },
      resident,
      lines: [{ label: 'Monthly food & catering', detail: `Breakfast, lunch, snacks & dinner · ${period}`, amount: note.messFee }],
      total: note.messFee,
      paidAt,
      notes: [`Catering fee is payable to ${catering.companyName}.`, 'Skipped-meal adjustments, if any, show in the next cycle.'],
    },
  ];
};

const residentOf = (student, company) => ({
  name: student?.user?.name || '—',
  father: student?.fatherName,
  roll: student?.rollNumber,
  room: student?.room?.roomNumber,
  floor: company?.floorLabel,
});

// ---------- rendering ----------

export const BillSheet = ({ sheet }) => {
  const { company, resident } = sheet;
  return (
    <article className="bd-sheet">
      <header className="bd-top">
        <div>
          <p className="bd-hostel">{company.hostelName}</p>
          {company.companyName && <p className="bd-run">Run by {company.companyName}</p>}
          <div className="bd-muted bd-small" style={{ maxWidth: 380 }}>{company.address}</div>
        </div>
        <div className="bd-kind">
          <h2>{sheet.title}</h2>
          {sheet.subtitle && <div className="bd-muted bd-small" style={{ marginTop: -4, marginBottom: 6 }}>{sheet.subtitle}</div>}
          <div className="bd-kv">
            {sheet.number && <><span>No.</span><span>{sheet.number}</span></>}
            <span>Issued</span><span>{fmtDate(sheet.issued, { year: 'numeric' })}</span>
            <span>Due by</span><span>{fmtDate(sheet.due, { year: 'numeric' })}</span>
          </div>
        </div>
      </header>
      <div className="bd-reg">
        {company.san && <span>SAN: {company.san}</span>}
        {company.udyamRegNo && <span>Udyam: {company.udyamRegNo}</span>}
        {company.fssai && <span>FSSAI: {company.fssai}</span>}
        {company.proprietorName && <span>Proprietor: {company.proprietorName}</span>}
      </div>

      <section className="bd-to">
        <div><b>Resident</b>{resident.name}</div>
        <div><b>Roll no.</b>{resident.roll || '—'}</div>
        {resident.father && <div><b>Father's name</b>{resident.father}</div>}
        <div><b>Room</b>{resident.room ? `${resident.room}${resident.floor ? ` · ${resident.floor}` : ''}` : '—'}</div>
      </section>

      <table className="bd-table">
        <thead>
          <tr><th style={{ width: 28 }}>#</th><th>Description</th><th className="r">Amount</th></tr>
        </thead>
        <tbody>
          {sheet.lines.map((l, i) => (
            <tr key={l.label}>
              <td>{i + 1}</td>
              <td><strong>{l.label}</strong>{l.detail && <div className="bd-muted bd-small">{l.detail}</div>}</td>
              <td className="r">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bd-total"><span>Total payable</span><span>{money(sheet.total)}</span></div>
      <div className="bd-words">{numberToWords(sheet.total)}</div>

      <footer className="bd-foot">
        <div className="bd-notes">
          <p style={{ marginBottom: 8 }}>
            {sheet.paidAt
              ? <span className="bd-stamp">PAID · {fmtDate(sheet.paidAt, { year: 'numeric' })}</span>
              : <span className="bd-due">Please pay by {fmtDate(sheet.due, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          </p>
          {!sheet.paidAt && <p>{HOW_TO_PAY}</p>}
          {sheet.notes.map((n) => <p key={n}>{n}</p>)}
        </div>
        <div className="bd-sign">
          {(company.companyName || company.hostelName) && <strong>For {company.companyName || company.hostelName}</strong>}
          <div className="line">Authorised signatory</div>
        </div>
      </footer>
      <div className="bd-cc">This is a computer-generated document.</div>
    </article>
  );
};

// Prints the given element's sheets through a hidden iframe
const printSheets = (node, title) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${DOC_CSS}</style></head><body>${node.innerHTML}</body></html>`);
  doc.close();
  frame.contentWindow.focus();
  setTimeout(() => {
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
  }, 150);
};

// Preview modal with a print button. `sheets` from invoiceSheets / demandSheets.
const BillDocument = ({ open, sheets = [], fileTitle = 'Fee document', onClose }) => {
  const ref = useRef(null);
  const [which, setWhich] = useState('all');
  const shown = useMemo(() => (which === 'all' ? sheets : sheets.filter((s) => s.key === which)), [sheets, which]);

  return (
    <CustomModal isOpen={open} onClose={() => { setWhich('all'); onClose(); }} title="Preview & print" size="xl">
      <style>{DOC_CSS}</style>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {sheets.length > 1 ? (
          <FilterChips
            id="bill-doc"
            value={which}
            onChange={setWhich}
            options={[{ value: 'all', label: 'Both' }, ...sheets.map((s) => ({ value: s.key, label: s.subtitle || s.title }))]}
          />
        ) : <span className="text-[13px] text-[var(--text-secondary)]">Choose “Save as PDF” in the print dialog to download.</span>}
        <button className="btn-primary" onClick={() => ref.current && printSheets(ref.current, fileTitle)}>
          <Printer size={16} /> Print / save PDF
        </button>
      </div>
      <div className="rounded-2xl bg-[var(--bg-primary)] p-3 sm:p-5 overflow-x-auto">
        <div ref={ref} className="min-w-[620px]">
          {shown.map((s) => <BillSheet key={s.key} sheet={s} />)}
        </div>
      </div>
    </CustomModal>
  );
};

export default BillDocument;
