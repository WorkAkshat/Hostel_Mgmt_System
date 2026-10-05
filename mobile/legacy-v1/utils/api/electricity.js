import client from './client';

export const submitReading = async (data) => {
  return client('/electricity/readings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getReadings = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return client(`/electricity/readings${query ? `?${query}` : ''}`);
};

export default {
  submitReading,
  getReadings
};
