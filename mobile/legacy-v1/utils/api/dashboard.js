import client from './client';

export const getDashboard = () => {
  return client('/dashboard');
};

export default {
  getDashboard,
};
