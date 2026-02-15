import axios from "axios";

export const API_BASE_URL = process.env.REACT_APP_BASE_URL || "https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


/**
 * Get auth token from storage (adjust to your setup)
 */
function getAuthToken() {
  // Example: use localStorage or cookies
  return sessionStorage.getItem("accessToken");
}

/**
 * Generic API request helper
 *
 * @param method - HTTP method ("GET", "POST", etc.)
 * @param endpoint - API route (e.g. "/auth/signin")
 * @param data - Request body or query params
 * @param config - Axios config
 * @param requireAuth - Whether to attach Bearer token (default true)
 */
export async function apiRequest(
  method,
  endpoint,
  data,
  config,
  requireAuth = true
) {
  try {
    const headers = {};

    // Attach token if required
    if (requireAuth) {
      const token = getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        // No access token found
      }
    }

    const options = {
      url: endpoint,
      method,
      headers,
      ...config,
    };

    if (method.toUpperCase() === "GET") {
      options.params = data;
    } else {
      options.data = data;
    }

    const response = await api.request(options);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "API request failed";
    throw new Error(message);
  }
}

export default apiRequest;
