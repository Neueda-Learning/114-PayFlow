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
  getHistory: (id) => api.get(`/payments/${id}/history`),
};

export const receivingAccountApi = {
  get: () => api.get('/receiving-account'),
  save: (data) => api.put('/receiving-account', data),
};
