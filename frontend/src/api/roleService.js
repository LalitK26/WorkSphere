import apiClient from './apiClient';

export const roleService = {
  getAll: () => apiClient.get('/roles'),
  getById: (id) => apiClient.get(`/roles/${id}`),
  create: (data) => apiClient.post('/roles', data),
  update: (id, data) => apiClient.put(`/roles/${id}`, data),
  delete: (id) => apiClient.delete(`/roles/${id}`),
  getPermissions: (id) => apiClient.get(`/roles/${id}/permissions`),
  updatePermissions: (id, data) => apiClient.put(`/roles/${id}/permissions`, data),
  resetPermissions: (id) => apiClient.post(`/roles/${id}/permissions/reset`),
  importPermissions: (id, sourceRoleId) => apiClient.post(`/roles/${id}/permissions/import/${sourceRoleId}`),
};

