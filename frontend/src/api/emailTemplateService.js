import apiClient from './apiClient';

/**
 * Email template API – used for read-only preview and management in Admin.
 * Templates are served from shared backend (/api/recruitment/email-templates).
 */
export const emailTemplateService = {
  getTemplateList: () => apiClient.get('/recruitment/email-templates/list'),
  previewTemplate: (templateName) =>
    apiClient.get(`/recruitment/email-templates/preview/${templateName}`),
  previewTemplateWithData: (templateName, data) =>
    apiClient.post(`/recruitment/email-templates/preview/${templateName}`, data),
};
