import api from './axios';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const paymentApi = {
  create: (data) => api.post('/payments', data),
  getAll: () => api.get('/payments'),
  getById: (id) => api.get(`/payments/${id}`),
  getByStatus: (status) => api.get(`/payments/status/${status}`),
  search: (params) => api.get('/payments/search', { params }),
  getHistory: (id) => api.get(`/payments/${id}/history`),
  retry: (id) => api.post(`/payments/${id}/retry`),
  rollback: (id) => api.post(`/payments/${id}/rollback`),
};

export const receivingAccountApi = {
  getAll: () => api.get('/receiving-account'),
  get: () => api.get('/receiving-account'),
  save: (data) => api.post('/receiving-account', data),
  delete: (id) => api.delete(`/receiving-account/${id}`),
};
