import apiRequest from "../utils/apiClient";
import { PUBLIC_SUBMIT_ERROR } from "../utils/safeMessages";

/**
 * Check whether someone is already registered (public, no auth).
 * Backend: GET /api/awakening-conference/check?email=...&phone=...
 * Accepts either or both params. Returns { exists: boolean, record? }.
 * 404 → not registered. Network/5xx errors throw so callers can block or retry.
 */
export const checkAwakeningRegistration = async ({ email, phone } = {}) => {
  const params = {};
  if (email && email.trim()) params.email = email.trim();
  if (phone && phone.trim()) params.phone = phone.trim();
  if (!params.email && !params.phone) return { exists: false };

  try {
    const response = await apiRequest(
      "GET",
      "/api/awakening-conference/check",
      params,
      undefined,
      false // public endpoint — no Bearer token
    );
    if (!response) return { exists: false };

    const payload = response.data ?? response.record;
    const explicitExists = [
      response.exists,
      response.registered,
      response.is_registered,
      response.isRegistered,
      payload?.exists,
      payload?.registered,
      payload?.is_registered,
      payload?.isRegistered,
    ].find((value) => typeof value === "boolean");

    if (typeof explicitExists === "boolean") {
      return {
        exists: explicitExists,
        record: payload && typeof payload === "object" ? payload : undefined,
      };
    }
    if (typeof payload === "boolean") return { exists: payload };
    if (Array.isArray(payload)) {
      return { exists: payload.length > 0, record: payload[0] };
    }
    if (payload && typeof payload === "object") {
      return { exists: true, record: payload };
    }
    return { exists: false };
  } catch (err) {
    if (err?.status === 404) return { exists: false };
    throw err;
  }
};

/**
 * Submit a public Awakening Conference registration (no auth required).
 * Backend: POST /api/awakening-conference
 */
export const submitAwakeningRegistration = async (data) => {
  const response = await apiRequest(
    "POST",
    "/api/awakening-conference",
    data,
    undefined,
    false // public endpoint — no Bearer token
  );
  if (!response || response.error) {
    throw new Error(response?.message || PUBLIC_SUBMIT_ERROR);
  }
  return response;
};

/**
 * Fetch registrations for admin view (JWT required — super-admin / church-admin).
 * Supports server-side filtering + pagination.
 * Backend: GET /api/super/admin/awakening-conference?page=1&limit=10&search=ada&campus=Gbagada...
 *
 * Returns: { data: [...], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
 */
export const fetchAwakeningRegistrations = async ({
  page = 1,
  limit = 10,
  search,
  campus,
  registrationType,
  serviceTeam,
} = {}) => {
  const params = { page, limit };
  if (search && search.trim()) params.search = search.trim();
  if (campus && campus !== "All Campuses") params.campus = campus;
  if (registrationType && registrationType !== "All Types") params.registration_type = registrationType;
  if (serviceTeam && serviceTeam !== "All Teams") params.preferred_service_team = serviceTeam;

  const response = await apiRequest(
    "GET",
    "/api/super/admin/awakening-conference",
    params
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to load registrations.");
  }
  // Normalise: backend returns { data: [], pagination: {} }
  return {
    data: response.data ?? [],
    pagination: response.pagination ?? {
      page,
      limit,
      total: (response.data ?? []).length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
};

/**
 * Update a registration (JWT required — super-admin / church-admin).
 * Backend: PUT /api/super/admin/awakening-conference/{id}
 */
export const updateAwakeningRegistration = async (id, data) => {
  const response = await apiRequest(
    "PUT",
    `/api/super/admin/awakening-conference/${id}`,
    data
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to update registration.");
  }
  return response;
};

/**
 * Delete a registration (JWT required — super-admin / church-admin).
 * Backend: DELETE /api/super/admin/awakening-conference/{id}
 */
export const deleteAwakeningRegistration = async (id) => {
  const response = await apiRequest(
    "DELETE",
    `/api/super/admin/awakening-conference/${id}`
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to delete registration.");
  }
  return response;
};
