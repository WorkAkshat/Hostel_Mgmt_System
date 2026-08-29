import client from './client';

export const getAll = async () => client('/floors');

export const getFloorReport = async (floorId) => client(`/floors/${floorId}/report`);

export const getConsolidatedReport = async () => client('/reports/consolidated');
