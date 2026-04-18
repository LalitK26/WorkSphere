import apiClient from './apiClient';

export const recruitmentCandidateService = {
    getProfile: async () => {
        const response = await apiClient.get('/recruitment/candidates/profile');
        return response.data;
    },

    saveProfile: async (data) => {
        const response = await apiClient.post('/recruitment/candidates/profile', data);
        return response.data;
    },

    uploadResume: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/recruitment/candidates/profile/resume/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    uploadExperienceLetter: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/recruitment/candidates/profile/experience-letter/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getCandidateProfileById: async (candidateId) => {
        const response = await apiClient.get(`/recruitment/candidates/profile/${candidateId}`);
        return response.data;
    },
};
