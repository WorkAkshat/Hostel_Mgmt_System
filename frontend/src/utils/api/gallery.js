import api from './client';

export const galleryApi = {
  all: () => api.get('/gallery'),
  add: (data) => api.post('/gallery', data),
  remove: (id) => api.delete(`/gallery/${id}`),
  helpline: () => api.get('/gallery/helpline'),
};

export default galleryApi;
