import apiClient from './apiClient';

export const employeeService = {
  getAll: () => apiClient.get('/employees'),
  // Paginated endpoint for better performance with large datasets
  getAllPaginated: (page = 0, size = 50, search = '') => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    // Trim search term to avoid issues with leading/trailing spaces
    const trimmedSearch = search ? search.trim() : '';
    if (trimmedSearch) {
      params.append('search', trimmedSearch);
    }
    return apiClient.get(`/employees/paginated?${params.toString()}`);
  },
  getById: (id) => apiClient.get(`/employees/${id}`),
  create: (data) => apiClient.post('/employees', data),
  update: (id, data) => apiClient.put(`/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/employees/${id}`),
  uploadProfilePicture: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/employees/${id}/profile-picture`, formData);
  },
};

