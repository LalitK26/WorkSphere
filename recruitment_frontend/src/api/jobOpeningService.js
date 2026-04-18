import apiClient from './apiClient';

export const jobOpeningService = {
  getAllJobOpenings: async (page = 0, size = 1000) => {
    const response = await apiClient.get('/recruitment/job-openings', {
      params: { page, size }
    });
    return response.data;
  },

  getJobOpeningById: async (id) => {
    const response = await apiClient.get(`/recruitment/job-openings/${id}`);
    return response.data;
  },

  createJobOpening: async (data) => {
    const response = await apiClient.post('/recruitment/job-openings', data);
    return response.data;
  },

  updateJobOpening: async (id, data) => {
    const response = await apiClient.put(`/recruitment/job-openings/${id}`, data);
    return response.data;
  },

  closeJobOpening: async (id) => {
    const response = await apiClient.put(`/recruitment/job-openings/${id}/close`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/recruitment/job-openings/statistics');
    return response.data;
  },
};
