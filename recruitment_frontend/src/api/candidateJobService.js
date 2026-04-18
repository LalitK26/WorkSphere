import apiClient from './apiClient';

export const candidateJobService = {
  getActiveJobOpenings: async () => {
    const response = await apiClient.get('/recruitment/candidate/job-openings');
    return response.data;
  },

  getJobOpeningById: async (id) => {
    const response = await apiClient.get(`/recruitment/candidate/job-openings/${id}`);
    return response.data;
  },

  applyForJob: async (jobOpeningId, data) => {
    const response = await apiClient.post(`/recruitment/job-applications/apply/${jobOpeningId}`, data);
    return response.data;
  },

  getMyApplications: async () => {
    const response = await apiClient.get('/recruitment/job-applications/my-applications');
    return response.data;
  },

  getApplicationById: async (id) => {
    const response = await apiClient.get(`/recruitment/job-applications/${id}`);
    return response.data;
  },
};
