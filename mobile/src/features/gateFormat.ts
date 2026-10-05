export { fmtDateTime, fmtTime, timeAgo } from '../lib/format';

// "2 h 15 m" since / until a moment. short=true gives "45 m" style for visits.
export const duration = (from: string | Date, short = false) => {
  const mins = Math.max(0, Math.round(Math.abs(Date.now() - new Date(from).getTime()) / 60000));
  if (mins < 60) return `${mins} m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return short ? `${h} h` : `${h} h ${mins % 60} m`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
};
