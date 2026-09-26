// Small display helpers shared by the redesigned pages.

export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const fmtDate = (value, opts = {}) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...opts }) : '';

export const fmtTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

export const fmtDateTime = (value) =>
  value ? `${new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(value)}` : '';

export const timeAgo = (value) => {
  if (!value) return '';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(value);
};

// "3h 20m" between two moments (or until now)
export const duration = (from, to = Date.now()) => {
  const minutes = Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

// Whole days a leave covers, counting both ends
export const daysSpan = (from, to) => {
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Value for <input type="datetime-local"> in local time
export const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const downloadCsv = (filename, header, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
