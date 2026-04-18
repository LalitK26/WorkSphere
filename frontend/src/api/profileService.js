import apiClient from './apiClient';

export const profileService = {
  getCurrentProfile: () => apiClient.get('/employees/me'),
  updateProfile: (data) => apiClient.put('/employees/me', data),
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/employees/me/profile-picture', formData);
  },
};

