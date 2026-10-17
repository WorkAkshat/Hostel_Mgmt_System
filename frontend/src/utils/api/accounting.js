import client from './client';

// floor: 'combined' or a floor number. Floor wardens are always limited to their own floor by the server.
const withFloor = (path, floor) => client(`/accounting/${path}?floorNumber=${encodeURIComponent(floor ?? 'combined')}`);

export const getHeads = () => client('/accounting/heads');
export const getDayBook = (floor) => withFloor('daybook', floor);
export const getTrialBalance = (floor) => withFloor('trial-balance', floor);
export const getProfitLoss = (floor) => withFloor('profit-loss', floor);
export const getBalanceSheet = (floor) => withFloor('balance-sheet', floor);
export const getStudentLedger = (studentId) => client(`/accounting/student-ledger/${studentId}`);

// data: { voucherType, amount, narration, debitHeadCode, creditHeadCode, date?, floorNumber? }
export const createVoucher = (data) => client('/accounting/vouchers', { method: 'POST', body: data });

// Pull paid invoices / demand notes into the ledger as receipt vouchers
export const sync = () => client('/accounting/sync', { method: 'POST' });
