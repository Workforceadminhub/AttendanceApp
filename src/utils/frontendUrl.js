/**
 * Get the frontend base URL
 * Uses REACT_APP_FRONTEND_URL if set, otherwise falls back to window.location.origin
 * @returns {string} The frontend base URL
 */
export const getFrontendBaseUrl = () => {
  if (process.env.REACT_APP_FRONTEND_URL) {
    return process.env.REACT_APP_FRONTEND_URL;
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for SSR or build time
  return '';
};
