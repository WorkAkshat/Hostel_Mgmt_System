import client from './client';

export const generate = async (billingMonth, floorNumber) =>
  client('/demand-notes/generate', { method: 'POST', body: { billingMonth, floorNumber } });

export const getAll = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return client(`/demand-notes${query ? `?${query}` : ''}`);
};

export const getCompanyConfig = async () => client('/demand-notes/company-config');

// Draft → sent. Residents only see a note after this. data: { ids } or { month, floorNumber }
export const send = async (data) => client('/demand-notes/send', { method: 'POST', body: data });

// Warden records a payment received. data: { method, reference, paidOn }
export const markPaid = async (id, data = {}) =>
  client(`/demand-notes/${id}/mark-paid`, { method: 'PATCH', body: data });

export const payOnline = async (id, data = {}) =>
  client(`/demand-notes/${id}/mark-paid`, { method: 'PATCH', body: data });

