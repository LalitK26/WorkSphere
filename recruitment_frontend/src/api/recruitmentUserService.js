import apiClient from './apiClient';

export const recruitmentUserService = {
  getAllUsers: async () => {
    const response = await apiClient.get('/recruitment/users');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/recruitment/users/${id}`);
    return response.data;
  },

  createUser: async (data) => {
    const response = await apiClient.post('/recruitment/users', data);
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await apiClient.put(`/recruitment/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id) => {
    await apiClient.delete(`/recruitment/users/${id}`);
  },
};

