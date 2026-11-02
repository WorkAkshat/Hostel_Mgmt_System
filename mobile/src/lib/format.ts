export const rupees = (n: unknown) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
// Short form for tight tiles: ₹950, ₹24.5k, ₹1.2L
export const rupeesShort = (n: unknown) => {
  const v = Math.round(Number(n) || 0);
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(v >= 1000000 ? 0 : 1).replace(/\.0$/, '')}L`;
  if (Math.abs(v) >= 10000) return `₹${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return rupees(v);
};

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

// 10-to-10 month billing cycle:
// If day is before the 10th, the active cycle belongs to the 10th of the previous month.
// If day is on or after the 10th, it belongs to the 10th of this month.
export const monthKey = (d: Date = new Date()) => {
  const date = new Date(d);
  if (date.getDate() < 10) {
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 15);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  const next = new Date(y, m - 1 + delta, 15);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

export const monthCycleDates = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  const start = new Date(y, m - 1, 10);
  const end = new Date(y, m, 10);
  return { start, end };
};

export const monthCycleLabel = (key: string, opts: { year?: boolean } = { year: true }) => {
  if (!key) return '';
  const { start, end } = monthCycleDates(key);
  const sDay = start.getDate();
  const sMon = start.toLocaleDateString('en-IN', { month: 'short' });
  const eDay = end.getDate();
  const eMon = end.toLocaleDateString('en-IN', { month: 'short' });
  const eYear = end.getFullYear();
  return opts.year ? `${sDay} ${sMon} – ${eDay} ${eMon} ${eYear}` : `${sDay} ${sMon} – ${eDay} ${eMon}`;
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
