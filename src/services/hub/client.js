import { fetchAllPages, hasPaginationMeta, extractPaginationMeta, FETCH_ALL_PAGE_LIMIT } from "../../utils/pagination.js";
import { apiRequest } from "../../utils/apiClient";

/**
 * Hub API helper - delegates to the existing apiRequest but prefixes
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

export function hubGet(endpoint, params, config, requireAuth = true) {
  return hubRequest("GET", endpoint, params, config, requireAuth);
}

export function hubPost(endpoint, data, config, requireAuth = true) {
  return hubRequest("POST", endpoint, data, config, requireAuth);
}

export function hubPut(endpoint, data, config, requireAuth = true) {
  return hubRequest("PUT", endpoint, data, config, requireAuth);
}

export function hubPatch(endpoint, data, config, requireAuth = true) {
  return hubRequest("PATCH", endpoint, data, config, requireAuth);
}

export function hubDelete(endpoint, params, config, requireAuth = true) {
  return hubRequest("DELETE", endpoint, params, config, requireAuth);
}

/** Fetch a complete Hub list as an array. */
export async function hubGetAll(endpoint, params, config, requireAuth = true) {
  return fetchAllPages(({ page, limit }) => hubGet(endpoint, { ...params, page, limit, per_page: limit }, config, requireAuth));
}

/** Collect paginated Hub lists while preserving non-paginated envelopes. */
export async function hubGetPaged(endpoint, params, config, requireAuth = true) {
  const first = await hubGet(endpoint, params, config, requireAuth);
  if (!hasPaginationMeta(first)) return first;
  const meta = extractPaginationMeta(first);
  const pageSize = params?.limit ?? params?.per_page ?? meta.limit ?? meta.per_page ?? FETCH_ALL_PAGE_LIMIT;
  const data = await fetchAllPages(
    ({ page, limit }) => hubGet(endpoint, { ...params, page, limit, per_page: limit }, config, requireAuth),
    { first, pageSize }
  );
  return Array.isArray(first) ? data : { ...first, data };
}
