import apiClient from './apiClient';

const documentService = {
    // Upload a document for an offer
    uploadDocument: async (offerId, documentType, file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);

        const response = await apiClient.post(
            `/recruitment/offers/${offerId}/documents/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    // Get all documents for an offer
    getDocumentsByOffer: async (offerId) => {
        const response = await apiClient.get(`/recruitment/offers/${offerId}/documents`);
        return response.data;
    },

    // View/Download a document
    viewDocument: async (documentId) => {
        const response = await apiClient.get(`/recruitment/offers/documents/${documentId}/view`, {
            responseType: 'blob',
        });
        return response.data;
    },

    // Verify a document (Admin/Recruiter only)
    verifyDocument: async (documentId) => {
        const response = await apiClient.put(`/recruitment/offers/documents/${documentId}/verify`);
        return response.data;
    },

    // Request resubmission of a document (Admin/Recruiter only)
    requestResubmission: async (documentId, remark) => {
        const response = await apiClient.put(
            `/recruitment/offers/documents/${documentId}/resubmit`,
            { remark }
        );
        return response.data;
    },

    // Check if all mandatory documents are verified
    checkDocumentsVerified: async (offerId) => {
        const response = await apiClient.get(`/recruitment/offers/${offerId}/documents/verification-status`);
        return response.data;
    },
};

export default documentService;
