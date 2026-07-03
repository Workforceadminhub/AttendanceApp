import axios from "axios";
import { clearAuthTokens, getAccessToken } from "./authSession";
import { authErrorMessage } from "./safeMessages";
import { redactSensitive } from "./redactSensitive";

if (!process.env.REACT_APP_BASE_URL) {
  throw new Error("REACT_APP_BASE_URL environment variable is required but not set.");
}
export const API_BASE_URL = process.env.REACT_APP_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── 401 Interceptor: session timeout → redirect to login ──────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Skip redirect for login requests (invalid credentials should stay on the login page)
      const url = error.config?.url || "";
      if (!url.includes("/auth/signin")) {
        clearAuthTokens();
        // Redirect to login only if not already there
        if (window.location.pathname !== "/login") {
          window.location.href = "/login?session=expired";
        }
      }
    }
    return Promise.reject(error);
  }
);

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
  return getAccessToken();
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
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(
        "[API Error]",
        redactSensitive(error.response?.data || error.message)
      );
    }
    const status = error.response?.status;
    const url = error.config?.url || "";

    // Non-login 401s are handled by the interceptor (session timeout → redirect).
    // Silently return so no toast/error flashes before the redirect.
    // Login 401s (wrong password) still need to throw so the login page can show the error.
    if (status === 401 && !url.includes("/auth/signin")) return;

    throw new Error(authErrorMessage(status));
  }
}

export default apiRequest;
