import { apiRequest } from "../../utils/apiClient";

/**
 * Hub API helper — delegates to the existing apiRequest but prefixes
 * every endpoint with /api/hub so callers can use short paths
 * (e.g. "/trainings" instead of "/api/hub/trainings").
 *
 * Reuses the same axios instance, Bearer token, and 401 interceptor
 * as the rest of the app.  No new axios instance, no new env var.
 */

const HUB_PREFIX = "/api/hub";

export function hubRequest(method, endpoint, data, config, requireAuth = true) {
  const prefixed = endpoint.startsWith(HUB_PREFIX)
    ? endpoint
    : `${HUB_PREFIX}${endpoint}`;
  return apiRequest(method, prefixed, data, config, requireAuth);
}

export function hubGet(endpoint, params, config) {
  return hubRequest("GET", endpoint, params, config);
}

export function hubPost(endpoint, data, config) {
  return hubRequest("POST", endpoint, data, config);
}

export function hubPut(endpoint, data, config) {
  return hubRequest("PUT", endpoint, data, config);
}

export function hubPatch(endpoint, data, config) {
  return hubRequest("PATCH", endpoint, data, config);
}

export function hubDelete(endpoint, params, config) {
  return hubRequest("DELETE", endpoint, params, config);
}
