import apiClient from './apiClient';
import axios from 'axios';

// Create a separate axios instance for session validation to avoid interceptors
const validationClient = axios.create({
  baseURL: '/api',
});

// Add token to validation requests
validationClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (isTabClose = false) => {
    const token = localStorage.getItem('token');
    
    // Clear session token and user data first (client-side)
    // This ensures the token is cleared even if server call fails
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    // Note: Only email is remembered (rememberedEmail, stayLoggedIn) - passwords are NEVER stored 
    // are intentionally preserved if user had "Stay logged in" checked

    // Try to call server logout endpoint if token existed
    if (token) {
      if (isTabClose) {
        // Tab is closing - use sendBeacon for reliable non-blocking call
        try {
          // sendBeacon doesn't support custom headers easily, so we include token in URL
          // or use a FormData with the token
          const formData = new FormData();
          formData.append('token', token);
          navigator.sendBeacon?.('/api/auth/logout', formData);
        } catch (error) {
          // Ignore errors during tab close - token already cleared client-side
        }
      } else {
        // Normal logout - try to call server endpoint if it exists
        try {
          await apiClient.post('/auth/logout').catch(() => {
            // If endpoint doesn't exist, that's okay - JWT is stateless
            // Token already cleared client-side, which is sufficient
          });
        } catch (error) {
          // If logout endpoint doesn't exist or fails, that's okay
          // Token already cleared client-side, which is sufficient for JWT
        }
      }
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Validate session with server - returns true if valid, false otherwise
  validateSession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    try {
      // Use validationClient to avoid triggering redirect interceptors
      const response = await validationClient.get('/auth/me/permissions');
      // If we get a successful response, session is valid
      return response.status === 200;
    } catch (error) {
      // Only clear token on authentication errors (401, 403)
      // Don't clear on network errors or other errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
        return false;
      }
      
      // For 404, check if it's actually an auth issue or endpoint issue
      if (error.response?.status === 404) {
        // Endpoint might not exist or user not found
        // Don't clear token for 404 - let the app handle it
        return false;
      }
      
      // Network errors or other errors - don't clear token
      // Return false but keep token intact
      return false;
    }
  },

  getCurrentUserPermissions: async () => {
    try {
      const response = await apiClient.get('/auth/me/permissions');
      return response.data;
    } catch (error) {
      return null;
    }
  }
};

