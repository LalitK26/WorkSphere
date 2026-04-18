import apiClient from './apiClient';

export const leaveService = {
  getAll: (params) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.leaveTypeId) queryParams.append('leaveTypeId', params.leaveTypeId);
    if (params?.status) queryParams.append('status', params.status);
    const queryString = queryParams.toString();
    return apiClient.get(`/leaves${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => apiClient.get(`/leaves/${id}`),
  getMyLeaves: () => apiClient.get('/leaves/my-leaves'),
  getQuota: () => apiClient.get('/leaves/quota'),
  create: (data) => apiClient.post('/leaves', data),
  update: (id, data) => apiClient.put(`/leaves/${id}`, data),
  delete: (id) => apiClient.delete(`/leaves/${id}`),
};

export const leaveTypeService = {
  getAll: () => apiClient.get('/leave-types'),
  getApplicable: (userId) =>
    apiClient.get('/leave-types/applicable', {
      params: userId ? { userId } : {},
    }),
  getById: (id) => apiClient.get(`/leave-types/${id}`),
  create: (data) => apiClient.post('/leave-types', data),
  update: (id, data) => apiClient.put(`/leave-types/${id}`, data),
  delete: (id) => apiClient.delete(`/leave-types/${id}`),
};

