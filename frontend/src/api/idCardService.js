import apiClient from './apiClient';

export const idCardService = {
  /**
   * Get current user's ID card as PDF blob (for viewing in iframe/object).
   */
  getPdfBlob: () => apiClient.get('/id-card/pdf', { responseType: 'blob' }),

  /**
   * Get ID card PDF for a specific employee (admin only). Returns blob for download.
   */
  getPdfForEmployee: (employeeId, download = true) =>
    apiClient.get('/id-card/pdf', {
      params: { employeeId, download: download ? 1 : 0 },
      responseType: 'blob',
    }),

  /**
   * Bulk download ID cards as ZIP (admin only). Request body: { employeeIds: [1, 2, 3] }.
   */
  getBulkPdf: (employeeIds) =>
    apiClient.post('/id-card/bulk-pdf', { employeeIds }, { responseType: 'blob' }),

  getPdfDownloadUrl: () => {
    const base = apiClient.defaults.baseURL || '/api';
    return `${base}/id-card/pdf?download=1`;
  },

  /**
   * Get ID card HTML preview.
   */
  getPreviewHtml: (employeeId) =>
    apiClient.get('/id-card/preview', {
      params: { employeeId },
      responseType: 'text',
    }),
};
