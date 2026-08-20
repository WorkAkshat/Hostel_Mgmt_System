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
