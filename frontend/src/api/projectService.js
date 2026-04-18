import apiClient from './apiClient';

export const projectService = {
  getAll: () => apiClient.get('/projects'),
  getById: (id) => apiClient.get(`/projects/${id}`),
  getMyProjects: () => apiClient.get('/projects/my-projects'),
  getPinned: () => apiClient.get('/projects/pinned'),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.put(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`),
  getCategories: () => apiClient.get('/project-categories'),
  createCategory: (payload) => apiClient.post('/project-categories', payload),
  deleteCategory: (id) => apiClient.delete(`/project-categories/${id}`),
  getFiles: (projectId) => apiClient.get(`/project-files/project/${projectId}`),
  uploadFile: (projectId, formData) =>
    apiClient.post(`/project-files/project/${projectId}`, formData),
  deleteFile: (fileId) => apiClient.delete(`/project-files/${fileId}`),
  downloadFile: (fileId) => apiClient.get(`/project-files/${fileId}/download`, { responseType: 'blob' }),
};

