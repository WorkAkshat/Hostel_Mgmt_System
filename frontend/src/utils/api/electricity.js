import client from './client';

// data: { roomId, readingMonth: 'YYYY-MM', previousReading, currentReading, ratePerUnit }
export const submitReading = async (data) => client('/electricity/readings', { method: 'POST', body: data });

// params: { month, floorNumber, roomId }
export const getReadings = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return client(`/electricity/readings${query ? `?${query}` : ''}`);
};
