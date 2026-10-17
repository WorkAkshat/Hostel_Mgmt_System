import client from './client';

export const getHeads = () => client('/accounting/heads');
export const getDayBook = (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return client(`/accounting/daybook${query}`);
};
export const getTrialBalance = (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return client(`/accounting/trial-balance${query}`);
};
export const getProfitLoss = (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return client(`/accounting/profit-loss${query}`);
};
export const getBalanceSheet = (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return client(`/accounting/balance-sheet${query}`);
};
export const createVoucher = (data) => client('/accounting/vouchers', {
  method: 'POST',
  body: data,
});
export const syncAccounting = () => client('/accounting/sync', {
  method: 'POST',
});

export default {
  getHeads,
  getDayBook,
  getTrialBalance,
  getProfitLoss,
  getBalanceSheet,
  createVoucher,
  syncAccounting,
};
