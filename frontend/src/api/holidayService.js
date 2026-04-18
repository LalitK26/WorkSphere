import apiClient from './apiClient';

export const holidayService = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const queryString = queryParams.toString();
    return apiClient.get(`/holidays${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => apiClient.get(`/holidays/${id}`),
  create: (data) => apiClient.post('/holidays', data),
  update: (id, data) => apiClient.put(`/holidays/${id}`, data),
  delete: (id) => apiClient.delete(`/holidays/${id}`),
};

