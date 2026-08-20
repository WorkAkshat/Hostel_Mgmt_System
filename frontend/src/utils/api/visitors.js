import client from './client';

export const getAll = () => {
  return client('/visitors');
};

export const create = (data) => {
  return client('/visitors', {
    method: 'POST',
    body: data
  });
};

export const checkOut = (id) => {
  return client(`/visitors/${id}/checkout`, {
    method: 'PUT'
  });
};
