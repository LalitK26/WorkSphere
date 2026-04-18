import apiClient from './apiClient';

export const advancedAnalyticsService = {
  // Get hiring activity over time data
  getHiringActivityOverTime: async (period = 'weekly') => {
    const response = await apiClient.get('/recruitment/analytics/hiring-activity', {
      params: { period }
    });
    return response.data;
  },

  // Get recruiter performance data
  getRecruiterPerformance: async () => {
    const response = await apiClient.get('/recruitment/analytics/recruiter-performance');
    return response.data;
  },

  // Get technical interviewer overview
  getTechnicalInterviewerOverview: async () => {
    const response = await apiClient.get('/recruitment/analytics/technical-interviewer-overview');
    return response.data;
  },

  // Get offer and hiring insights
  getOfferAndHiringInsights: async () => {
    const response = await apiClient.get('/recruitment/analytics/offer-hiring-insights');
    return response.data;
  },

  // Get department and role-based analysis
  getDepartmentRoleAnalysis: async () => {
    const response = await apiClient.get('/recruitment/analytics/department-role-analysis');
    return response.data;
  },
};
