import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { fmtDate, rupees } from '../lib/format';

// Builds a clean one-page bill / receipt and opens the share sheet (WhatsApp, Drive, print…)
export type BillDoc = {
  title: string;
  number: string;
  company?: { hostelName?: string; companyName?: string; address?: string; san?: string; udyamRegNo?: string };
  resident: { name: string; roll?: string; room?: string };
  lines: { label: string; detail?: string; amount: number }[];
  total: number;
  issued?: string | Date;
  due?: string | Date;
  paidAt?: string | Date | null;
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export const billHtml = (d: BillDoc) => `<!doctype html><html><head><meta charset="utf-8" />
<style>
body{font-family:Helvetica,Arial,sans-serif;color:#1b2a29;padding:28px;font-size:13px}
.top{display:flex;justify-content:space-between;border-bottom:2px solid #1b2a29;padding-bottom:12px}
h1{font-size:20px;margin:0} .muted{color:#5b6b67;font-size:11px}
.kind{text-align:right} .kind h2{margin:0 0 6px;font-size:15px;letter-spacing:1.5px;text-transform:uppercase}
.to{background:#f3faf9;border-radius:10px;padding:12px;margin:16px 0;display:flex;gap:30px}
table{width:100%;border-collapse:collapse} th{font-size:10px;text-transform:uppercase;color:#5b6b67;text-align:left;border-bottom:1px solid #1b2a29;padding:6px}
td{padding:9px 6px;border-bottom:1px solid #e3ecea} .r{text-align:right}
.total{display:flex;justify-content:space-between;font-weight:800;font-size:15px;border-top:2px solid #1b2a29;padding-top:10px;margin-top:2px}
.stamp{display:inline-block;border:2px solid #2f8a5b;color:#2f8a5b;border-radius:8px;padding:4px 12px;font-weight:800;letter-spacing:2px;margin-top:16px}
.due{display:inline-block;background:#fff4d6;color:#7a5200;border-radius:8px;padding:4px 10px;font-weight:700;margin-top:16px}
</style></head><body>
<div class="top"><div><h1>${esc(d.company?.hostelName || 'Hari Pushp Tower')}</h1>
${d.company?.companyName ? `<div><b>Run by ${esc(d.company.companyName)}</b></div>` : ''}
<div class="muted">${esc(d.company?.address || '')}</div>
<div class="muted">${d.company?.san ? `SAN: ${esc(d.company.san)} · ` : ''}${d.company?.udyamRegNo ? `Udyam: ${esc(d.company.udyamRegNo)}` : ''}</div></div>
<div class="kind"><h2>${esc(d.title)}</h2><div class="muted">No. ${esc(d.number)}</div>
${d.issued ? `<div class="muted">Issued ${esc(fmtDate(d.issued, { year: 'numeric' }))}</div>` : ''}
${d.due ? `<div class="muted">Due by ${esc(fmtDate(d.due, { year: 'numeric' }))}</div>` : ''}</div></div>
<div class="to"><div><div class="muted">Resident</div><b>${esc(d.resident.name)}</b></div>
<div><div class="muted">Roll no.</div>${esc(d.resident.roll || '—')}</div><div><div class="muted">Room</div>${esc(d.resident.room || '—')}</div></div>
<table><thead><tr><th>#</th><th>Description</th><th class="r">Amount</th></tr></thead><tbody>
${d.lines.map((l, i) => `<tr><td>${i + 1}</td><td><b>${esc(l.label)}</b>${l.detail ? `<div class="muted">${esc(l.detail)}</div>` : ''}</td><td class="r">${esc(rupees(l.amount))}</td></tr>`).join('')}
</tbody></table>
<div class="total"><span>Total</span><span>${esc(rupees(d.total))}</span></div>
${d.paidAt ? `<div class="stamp">PAID · ${esc(fmtDate(d.paidAt, { year: 'numeric' }))}</div>` : `<div class="due">Please pay at the hostel office by ${esc(fmtDate(d.due, { year: 'numeric' }))}</div>`}
<p class="muted" style="margin-top:24px">This is a computer-generated document.</p>
</body></html>`;

export async function shareBill(doc: BillDoc) {
  const html = billHtml(doc);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone — use Download instead.');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${doc.title} ${doc.number}`, UTI: 'com.adobe.pdf' });
}

// Download / print: opens the system print screen, where "Save as PDF" stores the
// file on the phone (Downloads). On the web it opens the browser's print dialog.
export async function downloadBill(doc: BillDoc) {
  await Print.printAsync({ html: billHtml(doc) });
}
