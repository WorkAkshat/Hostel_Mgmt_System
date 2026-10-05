export const rupees = (n: unknown) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const fmtDate = (v: unknown, opts: Intl.DateTimeFormatOptions = {}) =>
  v ? new Date(v as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...opts }) : '';

export const fmtTime = (v: unknown) => (v ? new Date(v as string).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');

export const fmtDateTime = (v: unknown) => (v ? `${fmtDate(v)}, ${fmtTime(v)}` : '');

export const timeAgo = (v: unknown) => {
  if (!v) return '';
  const s = Math.round((Date.now() - new Date(v as string).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(v);
};

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const isoDay = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const monthKey = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
};

export const monthLabel = (key: string, long = true) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: long ? 'long' : 'short', year: 'numeric' });
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const firstName = (name = '') => name.split(' ')[0] || name;
