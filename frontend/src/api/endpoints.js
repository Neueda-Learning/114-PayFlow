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
  retry: (id) => api.post(`/payments/${id}/retry`),
};
