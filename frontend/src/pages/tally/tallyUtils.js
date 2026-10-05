import {
  Bug, Bus, ChefHat, Droplets, Package, PencilRuler, Sparkles, Users, UtensilsCrossed, Wallet, Wifi, Wrench, Zap,
} from 'lucide-react';

export const money = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const inr = (n) => `₹${money(n)}`;
export const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

// Quick-entry expense heads (codes match the server's chart of accounts)
export const EXPENSE_CATEGORIES = [
  { code: 'EXP-CLEANING', label: 'Cleaning', icon: Sparkles },
  { code: 'EXP-MAINT', label: 'Repairs', icon: Wrench },
  { code: 'EXP-KITCHEN', label: 'Kitchen', icon: ChefHat },
  { code: 'EXP-WATER', label: 'Water / tanker', icon: Droplets },
  { code: 'EXP-ELEC-UTIL', label: 'Electricity bill', icon: Zap },
  { code: 'EXP-INTERNET', label: 'Internet', icon: Wifi },
  { code: 'EXP-STAFF-SALARY', label: 'Staff salary', icon: Users },
  { code: 'EXP-MESS-PAYMENT', label: 'Catering payment', icon: UtensilsCrossed },
  { code: 'EXP-TRANSPORT', label: 'Transport', icon: Bus },
  { code: 'EXP-STATIONERY', label: 'Stationery', icon: PencilRuler },
  { code: 'EXP-PEST-CONTROL', label: 'Pest control', icon: Bug },
  { code: 'EXP-PETTY-CASH', label: 'Petty cash', icon: Wallet },
  { code: 'EXP-OTHERS', label: 'Other', icon: Package },
];

export const VOUCHER_TYPES = [
  { value: 'RECEIPT', label: 'Receipt', hint: 'Money received', badge: 'badge-success' },
  { value: 'PAYMENT', label: 'Payment', hint: 'Money paid out', badge: 'badge-danger' },
  { value: 'JOURNAL', label: 'Journal', hint: 'Adjustment between heads', badge: 'badge-info' },
  { value: 'CONTRA', label: 'Contra', hint: 'Cash ↔ bank transfer', badge: 'badge-warning' },
];
export const voucherBadge = (type) => VOUCHER_TYPES.find((v) => v.value === type)?.badge || 'badge-info';

export const GROUP_LABELS = { INCOME: 'Income', EXPENSE: 'Expense', ASSET: 'Asset', LIABILITY: 'Liability', EQUITY: 'Capital' };

export const panel = 'bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)]';
