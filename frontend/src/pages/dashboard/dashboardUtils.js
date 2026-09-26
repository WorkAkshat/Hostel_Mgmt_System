export const formatRupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const timeAgo = (value) => {
  if (!value) return '';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export const daysBetween = (from, to) =>
  Math.max(1, Math.round((startOfDay(to) - startOfDay(from)) / 86400000) + 1);

export const residentName = (record) => record?.student?.user?.name || 'A resident';

export const roomOf = (record) => record?.student?.room?.roomNumber || null;

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

export { LEAVE_TYPES } from '../../config/hostel';

export const STATUS_BADGE = {
  PENDING: 'badge-warning',
  IN_PROGRESS: 'badge-info',
  APPROVED: 'badge-success',
  RESOLVED: 'badge-success',
  PAID: 'badge-success',
  UNPAID: 'badge-warning',
  REJECTED: 'badge-danger',
  CHECKED_OUT: 'bg-lilac-100 text-lilac-700',
  RETURNED: 'badge-info',
};

// Pastel tones — each kind of information keeps the same colour across the dashboard
export const TONES = {
  mint: { card: 'bg-mint-100 border-mint-200', chip: 'bg-brand-600 text-white', soft: 'bg-mint-100 text-brand-700' },
  sun: { card: 'bg-cream-100 border-cream-200', chip: 'bg-sun-300 text-sun-900', soft: 'bg-cream-100 text-sun-800' },
  lilac: { card: 'bg-lilac-50 border-lilac-100', chip: 'bg-lilac-500 text-white', soft: 'bg-lilac-100 text-lilac-700' },
  peach: { card: 'bg-peach-50 border-peach-100', chip: 'bg-peach-500 text-white', soft: 'bg-peach-100 text-peach-700' },
};

export const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};
