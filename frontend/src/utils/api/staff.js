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

// data: { name, department, designation, phoneNumber }
export const update = (id, data) => client(`/staff/${id}`, { method: 'PUT', body: data });

// Staff advances
export const getAdvances = (staffId) => client(`/staff-advances${staffId ? `?staffId=${staffId}` : ''}`);
export const createAdvance = (data) => client('/staff-advances', { method: 'POST', body: data });
export const recoverAdvance = (id, data) => client(`/staff-advances/${id}/recover`, { method: 'POST', body: data });
export const removeAdvance = (id) => client(`/staff-advances/${id}`, { method: 'DELETE' });
