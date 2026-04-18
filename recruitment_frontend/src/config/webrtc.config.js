/**
 * WebRTC Configuration
 * 
 * This file manages WebRTC ICE server configuration (STUN/TURN servers)
 * and WebSocket endpoints based on environment variables.
 * 
 * Environment Variables:
 * - VITE_WS_URL: WebSocket URL for signaling server
 * - VITE_STUN_SERVER_1/2/3: STUN server URLs
 * - VITE_TURN_ENABLED: Enable/disable TURN server
 * - VITE_TURN_URL: TURN server URL
 * - VITE_TURN_USERNAME: TURN server username
 * - VITE_TURN_CREDENTIAL: TURN server password
 */

// WebSocket URL Configuration
export const getWebSocketUrl = () => {
  const wsUrl = import.meta.env.VITE_WS_URL;

  // If environment variable is set, use it
  if (wsUrl) {
    return wsUrl;
  }

  // Auto-detect based on current environment
  if (import.meta.env.PROD) {
    // Production: Use current domain with HTTPS
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}/ws`;
  }

  // Development: Use current hostname (works for localhost and specific IP)
  return `http://${window.location.hostname}:8080/ws`;
};

// WebRTC ICE Servers Configuration
export const getIceServers = () => {
  const iceServers = [];

  // Add STUN servers
  const stunServer1 = import.meta.env.VITE_STUN_SERVER_1 || 'stun:stun.l.google.com:19302';
  const stunServer2 = import.meta.env.VITE_STUN_SERVER_2 || 'stun:stun1.l.google.com:19302';
  const stunServer3 = import.meta.env.VITE_STUN_SERVER_3 || 'stun:stun2.l.google.com:19302';

  iceServers.push({ urls: stunServer1 });
  iceServers.push({ urls: stunServer2 });
  iceServers.push({ urls: stunServer3 });

  // Add TURN server if enabled
  const turnEnabled = import.meta.env.VITE_TURN_ENABLED === 'true';
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnEnabled && turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential
    });

    // console.log('[WebRTC Config] TURN server configured:', turnUrl);
  } else {
    // console.log('[WebRTC Config] TURN server disabled or not configured');
  }

  return iceServers;
};

// Complete WebRTC Configuration
export const getWebRTCConfig = () => {
  return {
    iceServers: getIceServers()
  };
};

// Debug helper
export const logWebRTCConfig = () => {
  if (import.meta.env.VITE_DEBUG_MODE === 'true') {
    // console.log('[WebRTC Config] Environment:', import.meta.env.VITE_APP_ENV);
    // console.log('[WebRTC Config] WebSocket URL:', getWebSocketUrl());
    // console.log('[WebRTC Config] ICE Servers:', getIceServers());
  }
};
