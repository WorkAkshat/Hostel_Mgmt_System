import client from './client';

export const submitBulk = async (data) => {
  return client('/attendance/night/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getByDate = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return client(`/attendance/night${query ? `?${query}` : ''}`);
};
