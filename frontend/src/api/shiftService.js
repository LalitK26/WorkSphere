import apiClient from './apiClient';

export const shiftService = {
  getAll: () => apiClient.get('/shifts'),
  create: (data) => apiClient.post('/shifts', data),
  remove: (id) => apiClient.delete(`/shifts/${id}`),
};


