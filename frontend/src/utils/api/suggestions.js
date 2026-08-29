import client from './client';

export const create = async (content) => {
  return client('/suggestions', {
    method: 'POST',
    body: JSON.stringify({ content })
  });
};

export const getAll = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return client(`/suggestions${query ? `?${query}` : ''}`);
};

export const updateStatus = async (id, status) => {
  return client(`/suggestions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
};
