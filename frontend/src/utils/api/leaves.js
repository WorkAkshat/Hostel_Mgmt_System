import client from './client';

export const getAll = () => {
  return client('/leaves');
};

export const getMyLeaves = () => {
  return client('/leaves/my-leaves');
};

export const create = (data) => {
  return client('/leaves', {
    method: 'POST',
    body: data
  });
};

export const updateStatus = (id, status, comments = '') => {
  return client(`/leaves/${id}/status`, {
    method: 'PUT',
    body: { status, comments }
  });
};

export const logCheckout = (id) => {
  return client(`/leaves/${id}/checkout`, {
    method: 'PUT'
  });
};

export const logCheckin = (id) => {
  return client(`/leaves/${id}/checkin`, {
    method: 'PUT'
  });
};

export const biometricVerify = (data) => {
  return client('/leaves/biometric-verify', {
    method: 'POST',
    body: data
  });
};
