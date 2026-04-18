import apiClient from "./apiClient";

export const screeningService = {
  getAllApplications: async (page = 0, size = 1000) => {
    const response = await apiClient.get("/recruitment/job-applications/all", {
      params: { page, size }
    });
    return response.data;
  },

  getApplicationsByJobTitle: async (jobTitle) => {
    const response = await apiClient.get("/recruitment/job-applications/by-job-title", {
      params: { jobTitle: jobTitle }
    });
    return response.data;
  },

  getJobTitleStatistics: async () => {
    const response = await apiClient.get("/recruitment/job-applications/statistics/by-job-title");
    return response.data;
  },

  updateApplicationStatus: async (applicationId, status) => {
    const response = await apiClient.put(
      `/recruitment/job-applications/${applicationId}/status`,
      {
        status: status,
      }
    );
    return response.data;
  },
};
