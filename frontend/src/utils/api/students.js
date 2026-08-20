import client from './client';

export const getAll = () => {
  return client('/students');
};

export const getById = (id) => {
  return client(`/students/${id}`);
};

export const create = (data) => {
  return client('/students', {
    method: 'POST',
    body: data
  });
};

export const update = (id, data) => {
  return client(`/students/${id}`, {
    method: 'PUT',
    body: data
  });
};

export const remove = (id) => {
  return client(`/students/${id}`, {
    method: 'DELETE'
  });
};
