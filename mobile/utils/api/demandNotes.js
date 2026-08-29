import client from './client';

export const generate = async (billingMonth, floorNumber) => {
  return client('/demand-notes/generate', {
    method: 'POST',
    body: JSON.stringify({ billingMonth, floorNumber })
  });
};

export const getAll = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return client(`/demand-notes${query ? `?${query}` : ''}`);
};

export const getCompanyConfig = async () => {
  return client('/demand-notes/company-config');
};

export const markPaid = async (id) => {
  return client(`/demand-notes/${id}/mark-paid`, {
    method: 'PATCH'
  });
};

export const payOnline = async (id, data = {}) => {
  return client(`/demand-notes/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export default {
  generate,
  getAll,
  getCompanyConfig,
  markPaid,
  payOnline
};
