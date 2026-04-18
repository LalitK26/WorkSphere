import apiClient from './apiClient';

export const taskService = {
  getAll: () => apiClient.get('/tasks'),
  getById: (id) => apiClient.get(`/tasks/${id}`),
  getMyTasks: () => apiClient.get('/tasks/my-tasks'),
  getByProject: (projectId) => apiClient.get(`/tasks/project/${projectId}`),
  create: (data) => apiClient.post('/tasks', data),
  update: (id, data) => apiClient.put(`/tasks/${id}`, data),
  delete: (id) => apiClient.delete(`/tasks/${id}`),
  getCategories: () => apiClient.get('/task-categories'),
  createCategory: (payload) => apiClient.post('/task-categories', payload),
  deleteCategory: (id) => apiClient.delete(`/task-categories/${id}`),
  uploadAttachment: (taskId, formData) =>
    apiClient.post(`/tasks/${taskId}/attachment`, formData),
  deleteAttachment: (taskId) => apiClient.delete(`/tasks/${taskId}/attachment`),
};

