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

// Profile edit requests raised by students from the app
export const getProfileRequests = () => client('/students/profile-requests');

export const approveProfileRequest = (id) =>
  client(`/students/profile-requests/${id}/approve`, { method: 'POST' });

export const rejectProfileRequest = (id) =>
  client(`/students/profile-requests/${id}/reject`, { method: 'POST' });

// ID documents (Aadhaar / PAN / Passport numbers)
export const getDocuments = (status) =>
  client(`/students/documents${status ? `?status=${encodeURIComponent(status)}` : ''}`);

export const getStudentDocuments = (studentId) => client(`/students/documents/${studentId}`);

export const verifyDocument = (id, status) =>
  client(`/students/documents/${id}/verify`, { method: 'POST', body: { status } });

// ── Student self-service ──
// data: any of { phoneNumber, fatherName, parentContact, permanentAddress, state, pincode, coachingCollege }
export const requestProfileChange = (data) => client('/students/profile-requests', { method: 'POST', body: data });

export const getMyProfileRequests = () => client('/students/profile-requests/mine');

// data: { docType: 'AADHAAR' | 'PAN' | 'PASSPORT', documentNumber }
export const uploadDocument = (data) => client('/students/documents/upload', { method: 'POST', body: data });
