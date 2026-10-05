import client from './client';

// One-month operational summary. floor: 'all' or a floor number
export const getSummary = (month, floor = 'all') =>
  client(`/reports/summary?month=${encodeURIComponent(month)}${floor && floor !== 'all' ? `&floorNumber=${floor}` : ''}`);
