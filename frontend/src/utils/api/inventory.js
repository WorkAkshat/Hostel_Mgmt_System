import client from './client';

// Stock register: fixed assets, other inventory, consumables (kitchen groceries…)
export const getSummary = (month) => client(`/inventory/summary${month ? `?month=${encodeURIComponent(month)}` : ''}`);
export const getItems = (category) => client(`/inventory/items${category ? `?category=${category}` : ''}`);
export const createItem = (data) => client('/inventory/items', { method: 'POST', body: data });
export const updateItem = (id, data) => client(`/inventory/items/${id}`, { method: 'PUT', body: data });
export const deleteItem = (id) => client(`/inventory/items/${id}`, { method: 'DELETE' });
export const getMovements = (id) => client(`/inventory/items/${id}/movements`);
export const addMovement = (id, data) => client(`/inventory/items/${id}/movements`, { method: 'POST', body: data });
