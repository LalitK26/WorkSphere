import apiClient from './apiClient';

export const dashboardService = {
  getStats: () => apiClient.get('/dashboard/stats'),
  getGoogleMapsApiKey: () => apiClient.get('/dashboard/google-maps-api-key'),
};

