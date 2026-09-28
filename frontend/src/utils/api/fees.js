import client from './client';

export const getAll = () => client('/invoices');

export const getMyInvoices = () => client('/invoices/my-invoices');

// data: { studentRollNumber, amount, dueDate, rentAmount?, messAmount?, electricityAmount? }
export const create = (data) => client('/invoices', { method: 'POST', body: data });

// Student pays online or admin records payment. data: { method?, reference?, paidOn? }
export const pay = (id, data = {}) => client(`/invoices/${id}/pay`, { method: 'PUT', body: data });

// Admin corrects an unpaid invoice. data: { rentAmount, messAmount, electricityAmount, dueDate? }
export const update = (id, data) => client(`/invoices/${id}`, { method: 'PUT', body: data });

export const autoGenerateMonthly = () => client('/invoices/auto-generate-monthly', { method: 'POST' });
