import api from './client';

export const galleryApi = {
  all: () => api.get('/gallery'),
  meta: () => api.get('/gallery/meta'),
  add: (data) => api.post('/gallery', data),
  update: (id, data) => api.put(`/gallery/${id}`, data),
  remove: (id) => api.delete(`/gallery/${id}`),
  addCategory: (label, value) => api.post('/gallery/categories', { label, value }),
  removeCategory: (value) => api.delete(`/gallery/categories/${value}`),
  addType: (label, value) => api.post('/gallery/types', { label, value }),
  removeType: (value) => api.delete(`/gallery/types/${value}`),
  helpline: () => api.get('/gallery/helpline'),
};

export default galleryApi;
