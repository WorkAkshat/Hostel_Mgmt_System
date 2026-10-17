import client from './client';

export const getAll = () => {
  return client('/students');
};

export const getById = (id) => {
  return client(`/students/${id}`);
};

export const create = (data) => {
  return client('/students', {
    method: 'POST',
    body: data
  });
};

export const update = (id, data) => {
  return client(`/students/${id}`, {
    method: 'PUT',
    body: data
  });
};

export const remove = (id) => {
  return client(`/students/${id}`, {
    method: 'DELETE'
  });
};

export const submitProfileRequest = (data) => {
  return client('/students/profile-requests', {
    method: 'POST',
    body: data
  });
};

export const getPendingProfileRequests = () => {
  return client('/students/profile-requests');
};

export const approveProfileRequest = (id) => {
  return client(`/students/profile-requests/${id}/approve`, {
    method: 'POST'
  });
};

export const rejectProfileRequest = (id) => {
  return client(`/students/profile-requests/${id}/reject`, {
    method: 'POST'
  });
};

export const uploadDocument = (data) => {
  return client('/students/documents/upload', {
    method: 'POST',
    body: data
  });
};

export const verifyDocument = (id, status) => {
  return client(`/students/documents/${id}/verify`, {
    method: 'POST',
    body: { status }
  });
};

export const getDocuments = (studentId) => {
  return client(`/students/documents/${studentId}`);
};

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  submitProfileRequest,
  getPendingProfileRequests,
  approveProfileRequest,
  rejectProfileRequest,
  uploadDocument,
  verifyDocument,
  getDocuments,
};
