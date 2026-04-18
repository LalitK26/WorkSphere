import apiClient from './apiClient';

export const emailTemplateService = {
  getTemplateList: () => apiClient.get('/recruitment/email-templates/list'),
  
  previewTemplate: (templateName) => 
    apiClient.get(`/recruitment/email-templates/preview/${templateName}`),
  
  previewTemplateWithData: (templateName, data) => 
    apiClient.post(`/recruitment/email-templates/preview/${templateName}`, data),
};
