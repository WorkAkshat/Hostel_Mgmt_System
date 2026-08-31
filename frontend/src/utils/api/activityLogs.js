import client from './client';

export const getLogs = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
      query.append(k, v);
    }
  });
  const qs = query.toString();
  return client(`/activity-logs${qs ? `?${qs}` : ''}`);
};

export const getStats = () => client('/activity-logs/stats');
