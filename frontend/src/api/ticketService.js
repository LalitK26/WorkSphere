import apiClient from './apiClient';

export const ticketService = {
  getAll: (status) => {
    const params = status ? { status } : {};
    return apiClient.get('/tickets', { params });
  },
  getById: (id) => apiClient.get(`/tickets/${id}`),
  getSummary: () => apiClient.get('/tickets/summary'),
  create: (data) => apiClient.post('/tickets', data),
  update: (id, data) => apiClient.put(`/tickets/${id}`, data),
  delete: (id) => apiClient.delete(`/tickets/${id}`),
  addReply: (id, data) => apiClient.post(`/tickets/${id}/reply`, data),
};

