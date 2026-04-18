import apiClient from './apiClient';

export const recruitmentApplicationService = {
  getAllApplications: async (page = 0, size = 10000) => {
    const response = await apiClient.get('/recruitment/job-applications/all', {
      params: { page, size }
    });
    return response.data;
  },
};

