import client from './client';

export const getAll = () => {
  return client('/complaints');
};

export const getMyComplaints = () => {
  return client('/complaints/my-complaints');
};

export const create = (data) => {
  return client('/complaints', {
    method: 'POST',
    body: data
  });
};

export const update = (id, data) => {
  return client(`/complaints/${id}`, {
    method: 'PUT',
    body: data
  });
};
