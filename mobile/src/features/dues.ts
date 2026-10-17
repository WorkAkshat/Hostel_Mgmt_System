import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { demandNotesApi, feesApi, type ChargeCategory, type Payment } from '../api';
import { asList } from '../api/client';
import { useData } from '../lib/query';
import { fmtDate, monthKey, monthLabel } from '../lib/format';
import { billState, noteDueDate } from '../lib/hostel';
import { downloadBill, shareBill } from './receipt';

// Fee bills and demand notes as one list, so the warden sees everything a
// resident owes in one place.
export type Bill = {
  key: string;
  id: string;
  kind: 'invoice' | 'note';
  charge?: boolean; // a one-off charge (fine, deposit…) rather than the monthly fee
  studentId: string;
  student: any;
  title: string;
  number: string;
  amount: number;
  due: string | Date;
  paidAt?: string | null;
  state: 'paid' | 'due' | 'overdue';
  floor?: number;
  lines: { label: string; detail?: string; amount: number }[];
  raw: any;
};

const short = (m: string) => monthLabel(m).replace(/^(\w{3})\w*/, '$1');

// Extra charges the warden can raise on one resident
export const CHARGE_TYPES: { value: ChargeCategory; label: string; title: string; ask: boolean; paid: boolean }[] = [
  { value: 'FINE', label: 'Fine', title: 'Fine', ask: true, paid: true },
  { value: 'DAMAGE', label: 'Damage', title: 'Damage to hostel property', ask: true, paid: true },
  { value: 'DEPOSIT', label: 'Deposit', title: 'Security deposit', ask: true, paid: true },
  { value: 'LATE_FEE', label: 'Late fee', title: 'Late payment fee', ask: true, paid: true },
  { value: 'EXTRA', label: 'Extra service', title: 'Extra service', ask: true, paid: true },
  { value: 'ADVANCE', label: 'Advance', title: 'Advance payment', ask: false, paid: true },
  { value: 'OTHER', label: 'Other', title: '', ask: true, paid: true },
];

// How a fee bill or an extra charge reads on screen and on the PDF
export const invoiceView = (i: any) => {
  const charge = i.kind === 'CHARGE';
  return {
    charge,
    title: charge ? i.title || 'Charge' : `Fee bill · ${short(monthKey(new Date(i.createdAt)))}`,
    number: `${charge ? 'CHG' : 'INV'}/${String(i.id).slice(0, 6).toUpperCase()}`,
    lines: charge
      ? [{ label: i.title || 'Charge', detail: i.note || undefined, amount: Number(i.amount) || 0 }]
      : i.rentAmount != null || i.messAmount != null
        ? [{ label: 'Room rent', amount: i.rentAmount || 0 }, { label: 'Mess & catering', amount: i.messAmount || 0 }, ...(i.electricityAmount ? [{ label: 'Electricity', amount: i.electricityAmount }] : [])]
        : [{ label: 'Hostel fee', amount: Number(i.amount) || 0 }],
  };
};

// Heading on the PDF
export const docTitle = (kind: 'invoice' | 'note', paid: boolean, charge?: boolean) =>
  kind === 'note' ? (paid ? 'Demand note · paid' : 'Demand note') : charge ? (paid ? 'Payment receipt' : 'Payment request') : paid ? 'Fee receipt' : 'Fee bill';

export const toBills = (invoices: unknown, notes: unknown): Bill[] => [
  ...asList(invoices).map((i: any): Bill => {
    const v = invoiceView(i);
    return {
      key: `i-${i.id}`, id: i.id, kind: 'invoice', studentId: i.studentId, student: i.student, charge: v.charge,
      title: v.title, number: v.number,
      amount: Number(i.amount) || 0, due: i.dueDate, paidAt: i.paidAt, state: billState(i.status, i.dueDate) as Bill['state'],
      floor: i.floorNumber || i.student?.room?.floorNumber,
      lines: v.lines,
      raw: i,
    };
  }),
  ...asList(notes).map((n: any): Bill => {
    const due = noteDueDate(n);
    return {
      key: `n-${n.id}`, id: n.id, kind: 'note', studentId: n.studentId, student: n.student,
      title: `Demand note · ${short(n.billingMonth || monthKey(new Date(n.cycleStart)))}`, number: n.noteNumber,
      amount: Number(n.totalAmount) || 0, due, paidAt: n.paidAt, state: billState(n.status, due) as Bill['state'],
      floor: n.floorNumber,
      lines: [
        { label: 'Hostel accommodation', amount: n.hostelFee || 0 },
        { label: 'Electricity', detail: n.electricityUnits ? `${n.electricityUnits} units × ₹${n.electricityRate}` : undefined, amount: n.electricityAmount || 0 },
        { label: 'Mess & catering', amount: n.messFee || 0 },
      ],
      raw: n,
    };
  }),
].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

// Every bill in the hostel (warden view)
export const useAllBills = () => {
  const inv = useData(['invoices'], feesApi.all);
  const notes = useData(['demand-notes', 'all'], () => demandNotesApi.all());
  const bills = useMemo(() => toBills(inv.data, notes.data), [inv.data, notes.data]);
  return {
    bills,
    isLoading: inv.isLoading || notes.isLoading,
    error: inv.error || notes.error,
    refetch: () => Promise.all([inv.refetch(), notes.refetch()]),
  };
};

// Unpaid money per student: { total, overdue, count }
export const duesByStudent = (bills: Bill[]) => {
  const out: Record<string, { total: number; overdue: number; count: number }> = {};
  bills.filter((b) => b.state !== 'paid').forEach((b) => {
    const s = (out[b.studentId] ||= { total: 0, overdue: 0, count: 0 });
    s.total += b.amount;
    s.count += 1;
    if (b.state === 'overdue') s.overdue += b.amount;
  });
  return out;
};

// Record a payment against either kind of bill, then refresh every screen that shows bills
export const useRecordBill = () => {
  const qc = useQueryClient();
  return async (b: Bill, p: Payment) => {
    if (b.kind === 'invoice') await feesApi.recordPayment(b.id, p);
    else await demandNotesApi.recordPayment(b.id, p);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['invoices'] }),
      qc.invalidateQueries({ queryKey: ['demand-notes'] }),
      qc.invalidateQueries({ queryKey: ['student', b.studentId] }),
    ]);
  };
};

// Bill / receipt PDF for a resident
export const shareBillPdf = (b: Bill, company: any, resident: { name: string; roll?: string; room?: string }, mode: 'share' | 'download' = 'share') => (mode === 'download' ? downloadBill : shareBill)({
  title: docTitle(b.kind, b.state === 'paid', b.charge),
  number: b.number,
  company: b.raw.company || company,
  resident,
  lines: b.lines,
  total: b.amount,
  issued: b.raw.createdAt,
  due: b.due,
  paidAt: b.state === 'paid' ? b.paidAt : null,
});

export const dueLabel = (b: Bill) => (b.state === 'paid' ? `Paid ${fmtDate(b.paidAt || '', { year: 'numeric' })}` : `${b.state === 'overdue' ? 'Overdue since' : 'Due'} ${fmtDate(b.due, { year: 'numeric' })}`);
