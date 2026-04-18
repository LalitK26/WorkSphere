import apiClient from './apiClient';

const offerService = {
    // Admin/Recruiter: Generate new offer
    generateOffer: async (offerData) => {
        const response = await apiClient.post('/recruitment/offers/generate', offerData);
        return response.data;
    },

    // Admin/Recruiter: Send offer to candidate
    sendOffer: async (offerId) => {
        const response = await apiClient.put(`/recruitment/offers/${offerId}/send`);
        return response.data;
    },

    // Admin/Recruiter: Get all offers for a specific candidate
    getOffersByCandidate: async (candidateId) => {
        const response = await apiClient.get(`/recruitment/offers/candidate/${candidateId}`);
        return response.data;
    },

    // Candidate: Get all my offers
    getMyOffers: async () => {
        const response = await apiClient.get('/recruitment/offers/my-offers');
        return response.data;
    },

    // Both: Get offer by ID (with access control)
    getOfferById: async (offerId) => {
        const response = await apiClient.get(`/recruitment/offers/${offerId}`);
        return response.data;
    },

    // Candidate: Accept offer
    acceptOffer: async (offerId) => {
        const response = await apiClient.put(`/recruitment/offers/${offerId}/accept`);
        return response.data;
    },

    // Candidate: Reject offer
    rejectOffer: async (offerId) => {
        const response = await apiClient.put(`/recruitment/offers/${offerId}/reject`);
        return response.data;
    },

    // Both: Download offer PDF
    downloadOfferPdf: async (offerId) => {
        const response = await apiClient.get(`/recruitment/offers/${offerId}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },

    // Admin/Recruiter: Get all offers (for dashboard statistics)
    getAllOffers: async (page = 0, size = 1000) => {
        const response = await apiClient.get('/recruitment/offers/all', {
            params: { page, size }
        });
        return response.data;
    },
};

export default offerService;
