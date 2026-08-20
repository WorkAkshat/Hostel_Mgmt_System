import client from './client';

export const getAll = () => {
  return client('/staff');
};

export const create = (data) => {
  return client('/staff', {
    method: 'POST',
    body: data
  });
};

export const remove = (id) => {
  return client(`/staff/${id}`, {
    method: 'DELETE'
  });
};
