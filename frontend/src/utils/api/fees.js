import client from './client';

export const getAll = () => client('/invoices');

export const getMyInvoices = () => client('/invoices/my-invoices');

// data: { studentRollNumber, amount, dueDate }
export const create = (data) => client('/invoices', { method: 'POST', body: data });

// Warden records a payment received. data: { method: 'CASH'|'UPI'|'BANK'|'CHEQUE', reference, paidOn }
export const pay = (id, data = {}) => client(`/invoices/${id}/pay`, { method: 'PUT', body: data });

export const autoGenerateMonthly = () => client('/invoices/auto-generate-monthly', { method: 'POST' });
