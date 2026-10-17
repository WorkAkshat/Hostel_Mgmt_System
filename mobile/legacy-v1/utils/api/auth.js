import client from './client';

export const login = (email, password) => {
  return client('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
};

export const getMe = () => {
  return client('/auth/me');
};

export const getPending = () => {
  return client('/auth/pending');
};

export const approve = (id, data) => {
  return client(`/auth/approve/${id}`, {
    method: 'POST',
    body: data
  });
};

export const reject = (id) => {
  return client(`/auth/reject/${id}`, {
    method: 'POST'
  });
};

export const logout = () => {
  return client('/auth/logout', {
    method: 'POST'
  });
};

export const refresh = () => {
  return client('/auth/refresh', {
    method: 'POST'
  });
};

export const updatePushToken = (pushToken) => {
  return client('/auth/push-token', {
    method: 'POST',
    body: { pushToken }
  });
};

export default {
  login,
  getMe,
  getPending,
  approve,
  reject,
  logout,
  refresh,
  updatePushToken,
};
