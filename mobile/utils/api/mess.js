import client from './client';

export const getStats = () => {
  return client('/mess/stats');
};

export const getMyAttendance = () => {
  return client('/mess/my-attendance');
};

export const biometricVerify = (data) => {
  return client('/mess/biometric-verify', {
    method: 'POST',
    body: data
  });
};

export const getMenu = () => {
  return client('/mess/menu');
};

export const updateMenu = (data) => {
  return client('/mess/menu', {
    method: 'POST',
    body: data
  });
};

export default {
  getStats,
  getMyAttendance,
  biometricVerify,
  getMenu,
  updateMenu,
};
