import { MEALS, WEEK_DAYS } from '../../config/hostel';

// The backend stores { Monday: { breakfast, lunch, snacks, dinner } }.
// Older copies used capitalised meal names — accept both.
export const normalizeMenu = (raw) =>
  Object.fromEntries(
    WEEK_DAYS.map((day) => {
      const src = raw?.[day] || {};
      return [day, Object.fromEntries(MEALS.map((m) => [m.key, src[m.key] ?? src[m.label] ?? '']))];
    })
  );

export const dayName = (date = new Date()) => WEEK_DAYS[(new Date(date).getDay() + 6) % 7];

// Meal start/end in minutes after midnight, used to highlight "now" and lock skipping
const WINDOWS = { breakfast: [450, 540], lunch: [750, 840], snacks: [990, 1050], dinner: [1140, 1260] };

export const mealState = (mealKey, date = new Date()) => {
  const now = new Date();
  const sameDay = new Date(date).toDateString() === now.toDateString();
  if (!sameDay) return new Date(date) > now ? 'upcoming' : 'over';
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [start, end] = WINDOWS[mealKey];
  if (minutes < start) return 'upcoming';
  if (minutes <= end) return 'serving';
  return 'over';
};

export const isoDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
