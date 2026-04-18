import apiClient from './apiClient';

export const departmentService = {
  getAll: (search) =>
    apiClient.get('/departments', {
      params: search ? { search } : {},
    }),
  getById: (id) => apiClient.get(`/departments/${id}`),
  create: (data) => apiClient.post('/departments', data),
  update: (id, data) => apiClient.put(`/departments/${id}`, data),
  delete: (id) => apiClient.delete(`/departments/${id}`),
};



