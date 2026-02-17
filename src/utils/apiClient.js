import axios from "axios";

export const API_BASE_URL = process.env.REACT_APP_BASE_URL || "https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


/**
 * Serialize params for GET: array values become a single JSON string so the server
 * receives one query param (e.g. permissions=["Workforce Admin"]) instead of repeated keys.
 * Always uses JSON.stringify for arrays to handle department names with commas correctly.
 */
function serializeParams(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    // Always JSON.stringify arrays (including permissions) to handle commas in values
    out[key] = Array.isArray(value) ? JSON.stringify(value) : value;
  }
  return out;
}

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
      // Serialize array params as JSON so the server receives one param (e.g. Permissions as array)
      options.params = data && typeof data === "object" ? serializeParams(data) : data;
      // Also serialize params from config if present
      if (config?.params && typeof config.params === "object") {
        options.params = { ...options.params, ...serializeParams(config.params) };
      }
    } else {
      options.data = data;
      // Serialize params in config for non-GET requests too (e.g. DELETE with query params)
      if (config?.params && typeof config.params === "object") {
        options.params = serializeParams(config.params);
      }
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
