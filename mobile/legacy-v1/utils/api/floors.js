import client from './client';

export const floors = {
  // Get all floors with stats
  getAll: () => client('/floors'),

  // Get floor details & students (grouped by room)
  getStudents: (floorNumber) => client(`/floors/${floorNumber}/students`),

  // Get floor financial report for a month
  getReport: (floorNumber, month) => client(`/floors/${floorNumber}/report${month ? `?month=${month}` : ''}`),

  // Get consolidated financial report across all floors
  getConsolidatedReport: (month) => client(`/floors/consolidated/report${month ? `?month=${month}` : ''}`),
};

export default floors;
