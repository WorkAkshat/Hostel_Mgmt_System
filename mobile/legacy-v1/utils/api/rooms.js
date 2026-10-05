import client from './client';

export const getAll = () => {
  return client('/rooms');
};

export const getById = (id) => {
  return client(`/rooms/${id}`);
};

export const create = (data) => {
  return client('/rooms', {
    method: 'POST',
    body: data
  });
};

export const update = (id, data) => {
  return client(`/rooms/${id}`, {
    method: 'PUT',
    body: data
  });
};

export const remove = (id) => {
  return client(`/rooms/${id}`, {
    method: 'DELETE'
  });
};

export default {
  getAll,
  getById,
  create,
  update,
  remove,
};
