// Hostel rules and labels — kept in step with frontend/src/config/hostel.js
import type { Tone } from '../ui/theme';

export const ROOM_PRICING: Record<number, { label: string; roomRent: number; messFee: number; total: number }> = {
  1: { label: 'Single sharing', roomRent: 13000, messFee: 3000, total: 16000 },
  2: { label: 'Twin sharing', roomRent: 11000, messFee: 3000, total: 14000 },
  3: { label: 'Triple sharing', roomRent: 9000, messFee: 3000, total: 12000 },
};
export const priceFor = (sharing?: number) => ROOM_PRICING[sharing || 2] || ROOM_PRICING[2];

export const LEAVE_TYPES: Record<string, string> = {
  NIGHT_OUT: 'Night out',
  OUT_OF_STATION: 'Going home',
  EMERGENCY: 'Emergency',
  OUTING: 'Outing',
  HOME_LEAVE: 'Home leave',
};

export const LEAVE_STATUS: Record<string, { label: string; short: string; tone: Tone }> = {
  PENDING: { label: 'Waiting for approval', short: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved — not left yet', short: 'Approved', tone: 'success' },
  CHECKED_OUT: { label: 'Out of hostel', short: 'Out', tone: 'lilac' },
  RETURNED: { label: 'Back in hostel', short: 'Returned', tone: 'mint' },
  REJECTED: { label: 'Not approved', short: 'Rejected', tone: 'danger' },
};

export const COMPLAINT_CATEGORIES = ['Electrical', 'Plumbing', 'HVAC', 'Wi-Fi', 'Furniture', 'Cleaning', 'Mess & Food', 'App / Web Issue', 'Others'];

export const COMPLAINT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Open', tone: 'warning' },
  IN_PROGRESS: { label: 'In progress', tone: 'lilac' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
};

export const PRIORITIES: Record<string, { label: string; tone: Tone }> = {
  LOW: { label: 'Low', tone: 'white' },
  MEDIUM: { label: 'Medium', tone: 'mint' },
  HIGH: { label: 'High', tone: 'warning' },
  URGENT: { label: 'Urgent', tone: 'danger' },
};

export const MEALS = [
  { key: 'breakfast', type: 'BREAKFAST', label: 'Breakfast', time: '7:30–9:00 AM', window: [450, 540] },
  { key: 'lunch', type: 'LUNCH', label: 'Lunch', time: '12:30–2:00 PM', window: [750, 840] },
  { key: 'snacks', type: 'SNACKS', label: 'Snacks', time: '4:30–5:30 PM', window: [990, 1050] },
  { key: 'dinner', type: 'DINNER', label: 'Dinner', time: '7:00–9:00 PM', window: [1140, 1260] },
] as const;

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const dayName = (d: Date = new Date()) => WEEK_DAYS[(d.getDay() + 6) % 7];

// Backend stores { Monday: { breakfast, lunch, snacks, dinner } }; older copies used capitalised keys
export const normalizeMenu = (raw: any): Record<string, Record<string, string>> =>
  Object.fromEntries(WEEK_DAYS.map((day) => {
    const src = raw?.[day] || {};
    return [day, Object.fromEntries(MEALS.map((m) => [m.key, src[m.key] ?? src[m.label] ?? '']))];
  }));

export const mealState = (window: readonly number[], date: Date = new Date()) => {
  const now = new Date();
  if (date.toDateString() !== now.toDateString()) return date > now ? 'upcoming' : 'over';
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < window[0]) return 'upcoming';
  if (mins <= window[1]) return 'serving';
  return 'over';
};

export const DOCUMENT_TYPES: Record<string, string> = { AADHAAR: 'Aadhaar card', PAN: 'PAN card', PASSPORT: 'Passport' };

export const STUDENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  CHECKED_IN: { label: 'Checked in', tone: 'success' },
  CHECKED_OUT: { label: 'Checked out', tone: 'warning' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
};

export const RELATIONS = ['Father', 'Mother', 'Sibling', 'Guardian', 'Relative', 'Friend'];

// Bills: 'paid' | 'overdue' | 'due'
export const billState = (status: string, due?: string | Date | null) => {
  if (status === 'PAID') return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due && new Date(due) < today ? 'overdue' : 'due';
};
export const BILL_STATUS: Record<string, { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'success' },
  overdue: { label: 'Overdue', tone: 'danger' },
  due: { label: 'Due', tone: 'warning' },
};
export const noteDueDate = (note: any) => {
  const start = new Date(note.cycleStart);
  const grace = new Date(new Date(note.createdAt).getTime() + 5 * 86400000);
  return grace > start ? grace : start;
};
