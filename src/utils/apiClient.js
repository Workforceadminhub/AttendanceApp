import axios from "axios";

const baseUrl = process.env.REACT_APP_BASE_URL;
if (!baseUrl)
  throw new Error("❌ Base URL is not defined in environment variables");

const api = axios.create({
  baseURL: baseUrl,
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
        console.warn("⚠️ No access token found; request may fail.");
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
    console.error(
      `❌ API ${method} ${endpoint} failed:`,
      error.response?.data || error.message
    );
    throw new Error(error.response?.data?.message || "API request failed");
  }
}

export default apiRequest;
