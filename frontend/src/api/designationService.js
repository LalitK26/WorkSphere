import apiClient from './apiClient';

export const designationService = {
  getAll: (search) =>
    apiClient.get('/designations', {
      params: search ? { search } : {},
    }),
  getById: (id) => apiClient.get(`/designations/${id}`),
  create: (data) => apiClient.post('/designations', data),
  update: (id, data) => apiClient.put(`/designations/${id}`, data),
  delete: (id) => apiClient.delete(`/designations/${id}`),
};

