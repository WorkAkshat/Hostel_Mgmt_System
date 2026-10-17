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
    body: JSON.stringify(data)
  });
};

export const optOutMeal = (data) => {
  return client('/mess/opt-out', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const cancelOptOut = (id) => {
  return client(`/mess/opt-out/${id}`, {
    method: 'DELETE'
  });
};

export const getCookDashboard = (date) => {
  return client(`/mess/cook-dashboard${date ? `?date=${date}` : ''}`);
};

export const getMenu = () => {
  return client('/mess/menu');
};

export const updateMenu = (data) => {
  return client('/mess/menu', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export default {
  getStats,
  getMyAttendance,
  biometricVerify,
  optOutMeal,
  cancelOptOut,
  getCookDashboard,
  getMenu,
  updateMenu
};
