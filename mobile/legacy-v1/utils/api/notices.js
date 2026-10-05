import client from './client';

export const getAll = () => {
  return client('/notices');
};

export const create = (data) => {
  return client('/notices', {
    method: 'POST',
    body: data
  });
};

export const remove = (id) => {
  return client(`/notices/${id}`, {
    method: 'DELETE'
  });
};

export default {
  getAll,
  create,
  remove,
};
