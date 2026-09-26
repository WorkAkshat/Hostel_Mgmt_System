import { useEffect, useState } from 'react';
import { Banknote, Landmark, ScrollText, Smartphone } from 'lucide-react';
import { demandNotes as demandNotesApi } from '../../utils/api';

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote, refLabel: 'Receipt book no.', refHint: 'Optional' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, refLabel: 'UPI transaction ID', refHint: '12-digit UTR from the payment app' },
  { value: 'BANK', label: 'Bank transfer', icon: Landmark, refLabel: 'Bank reference / UTR', refHint: 'From the bank statement' },
  { value: 'CHEQUE', label: 'Cheque', icon: ScrollText, refLabel: 'Cheque number', refHint: 'Six digits on the cheque' },
];

export const BILL_STATUS = {
  paid: { label: 'Paid', badge: 'badge-success' },
  overdue: { label: 'Overdue', badge: 'badge-danger' },
  due: { label: 'Due', badge: 'badge-warning' },
};

const DAY = 86400000;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// 'paid' | 'overdue' | 'due' for an invoice or a demand note
export const billState = (status, dueDate) => {
  if (status === 'PAID') return 'paid';
  return dueDate && new Date(dueDate) < startOfToday() ? 'overdue' : 'due';
};

export const daysOverdue = (dueDate) => Math.max(0, Math.floor((startOfToday() - new Date(dueDate)) / DAY));

// Demand notes are payable by the 10th (cycle start); late generations get five days
export const noteDueDate = (note) => {
  const start = new Date(note.cycleStart);
  const grace = new Date(new Date(note.createdAt).getTime() + 5 * DAY);
  return grace > start ? grace : start;
};

export const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const currentMonth = () => monthKey(new Date());

export const shiftMonth = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
};

export const monthLabel = (key, opts = { month: 'long', year: 'numeric' }) => {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', opts);
};

export const invoiceNumber = (inv) =>
  `INV/${monthKey(inv.createdAt).replace('-', '')}/${String(inv.id).slice(0, 6).toUpperCase()}`;

export const numberToWords = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (x) => {
    if (x < 20) return ones[x];
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ` ${ones[x % 10]}` : '');
    if (x < 1000) return `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${convert(x % 100)}` : ''}`;
    if (x < 100000) return `${convert(Math.floor(x / 1000))} Thousand${x % 1000 ? ` ${convert(x % 1000)}` : ''}`;
    if (x < 10000000) return `${convert(Math.floor(x / 100000))} Lakh${x % 100000 ? ` ${convert(x % 100000)}` : ''}`;
    return `${convert(Math.floor(x / 10000000))} Crore${x % 10000000 ? ` ${convert(x % 10000000)}` : ''}`;
  };
  return `${convert(n)} Rupees Only`;
};

// Company details per floor + fee structure, fetched once per session
let companyCache = null;
export const useCompanyConfig = () => {
  const [config, setConfig] = useState(companyCache);
  useEffect(() => {
    if (companyCache) return;
    let alive = true;
    demandNotesApi.getCompanyConfig()
      .then((c) => {
        companyCache = c;
        if (alive) setConfig(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return config;
};

// Sum helper
export const total = (list, pick = (x) => x.amount) => list.reduce((s, x) => s + (Number(pick(x)) || 0), 0);
