import client from './client';

export const getAll = (category) => client(`/notices${category ? `?category=${encodeURIComponent(category)}` : ''}`);

export const create = (data) => client('/notices', { method: 'POST', body: data });

export const remove = (id) => client(`/notices/${id}`, { method: 'DELETE' });
