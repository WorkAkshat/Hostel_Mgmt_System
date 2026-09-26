import client from './client';

export const generate = async (billingMonth, floorNumber) =>
  client('/demand-notes/generate', { method: 'POST', body: { billingMonth, floorNumber } });

export const getAll = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return client(`/demand-notes${query ? `?${query}` : ''}`);
};

export const getCompanyConfig = async () => client('/demand-notes/company-config');

// Warden records a payment received. data: { method, reference, paidOn }
export const markPaid = async (id, data = {}) =>
  client(`/demand-notes/${id}/mark-paid`, { method: 'PATCH', body: data });
