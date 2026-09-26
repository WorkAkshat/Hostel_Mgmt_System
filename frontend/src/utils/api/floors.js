import client from './client';

export const getAll = async () => client('/floors');

export const getFloorReport = async (floorId) => client(`/floors/${floorId}/report`);

export const getConsolidatedReport = async () => client('/floors/consolidated/report');

// Room-wise residents of one floor
export const getStudents = async (floorNumber) => client(`/floors/${floorNumber}/students`);

// Billing report for one floor, or 'combined' for all floors. month = 'YYYY-MM'
export const getReport = async (floorNumber, month) =>
  client(
    floorNumber === 'combined'
      ? `/floors/consolidated/report?month=${month}`
      : `/floors/${floorNumber}/report?month=${month}`
  );
