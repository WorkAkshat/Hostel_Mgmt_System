import client from './client';

export const getAll = () => {
  return client('/invoices');
};

export const getMyInvoices = () => {
  return client('/invoices/my-invoices');
};

export const create = (data) => {
  return client('/invoices', {
    method: 'POST',
    body: data
  });
};

export const pay = (id) => {
  return client(`/invoices/${id}/pay`, {
    method: 'PUT'
  });
};
