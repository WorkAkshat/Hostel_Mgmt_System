import client from './client';

export const getAll = () => client('/polls');
export const create = (data) => client('/polls', { method: 'POST', body: data });
export const update = (id, data) => client(`/polls/${id}`, { method: 'PUT', body: data });
export const vote = (id, option) => client(`/polls/${id}/vote`, { method: 'POST', body: { option } });
export const removeVote = (id) => client(`/polls/${id}/vote`, { method: 'DELETE' });
export const toggle = (id) => client(`/polls/${id}/toggle`, { method: 'PUT' });
export const remove = (id) => client(`/polls/${id}`, { method: 'DELETE' });

