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
  updateHostelInfo: (data) => api.put('/gallery/helpline', data),
  addContact: (data) => api.post('/gallery/helpline/contacts', data),
  updateContact: (id, data) => api.put(`/gallery/helpline/contacts/${id}`, data),
  removeContact: (id) => api.delete(`/gallery/helpline/contacts/${id}`),
  addRule: (data) => api.post('/gallery/helpline/rules', data),
  updateRule: (id, data) => api.put(`/gallery/helpline/rules/${id}`, data),
  removeRule: (id) => api.delete(`/gallery/helpline/rules/${id}`),
};

export default galleryApi;
