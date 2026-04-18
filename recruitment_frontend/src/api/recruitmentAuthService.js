import apiClient from './apiClient';

export const recruitmentAuthService = {
  login: async (email, password) => {
    const response = await apiClient.post('/recruitment/auth/login', { email, password });
    return response.data;
  },

  registerCandidate: async (data) => {
    const response = await apiClient.post('/recruitment/auth/register', data);
    return response.data;
  },

  verifyRegistration: async (email, otp) => {
    const response = await apiClient.post('/recruitment/auth/verify-registration', { email, otp });
    return response.data;
  },

  resendRegistrationOtp: async (email) => {
    const response = await apiClient.post('/recruitment/auth/resend-registration-otp', { email });
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await apiClient.post(`/recruitment/auth/verify-email?token=${token}`);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('recruitment_token');
    localStorage.removeItem('recruitment_user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('recruitment_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem('recruitment_token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('recruitment_token');
  },

  forgotPassword: {
    requestOtp: async (email) => {
      const response = await apiClient.post('/recruitment/auth/forgot-password/request-otp', { email });
      return response.data;
    },
    verifyOtp: async (email, otp) => {
      const response = await apiClient.post('/recruitment/auth/forgot-password/verify-otp', { email, otp });
      return response.data;
    },
    changePassword: async (email, otp, newPassword, confirmPassword) => {
      const response = await apiClient.post('/recruitment/auth/forgot-password/change-password', {
        email,
        otp,
        newPassword,
        confirmPassword,
      });
      return response.data;
    },
  },
};

