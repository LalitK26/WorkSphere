/**
 * Utility function to convert relative API URLs to full URLs in production
 * This ensures images and files work correctly when frontend and API are on different domains
 * 
 * @param {string} url - The URL from the backend (can be relative or absolute)
 * @returns {string|null} - Full URL in production, relative URL in development, or null if input is null/empty
 */
export const getFullImageUrl = (url) => {
  if (!url) return null;
  
  // If already a full URL (http:// or https://), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If relative URL starting with /api, prepend API base URL in production
  if (url.startsWith('/api/')) {
    const isProduction = import.meta.env.VITE_APP_ENV === 'production';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (isProduction && apiBaseUrl) {
      // Remove trailing slash from base URL if present
      const baseUrl = apiBaseUrl.replace(/\/$/, '');
      
      // If baseURL already includes /api, don't duplicate it
      if (baseUrl.endsWith('/api')) {
        return `${baseUrl}${url.substring(4)}`; // Remove /api from url
      } else {
        return `${baseUrl}${url}`;
      }
    }
    
    // In development, return relative URL as-is (will use proxy)
    return url;
  }
  
  // Return as-is if not an API URL
  return url;
};

