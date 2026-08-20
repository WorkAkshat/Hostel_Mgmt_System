import client from './client';

export const getDashboard = () => client('/dashboard');

export default {
  getDashboard
};
