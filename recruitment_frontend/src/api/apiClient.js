import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_APP_ENV === 'production' && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '/api';
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('recruitment_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the 401 is from a login endpoint (don't redirect, let component handle it)
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('recruitment_token');
      localStorage.removeItem('recruitment_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

