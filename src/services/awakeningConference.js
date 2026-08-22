import apiRequest from "../utils/apiClient";
import { PUBLIC_SUBMIT_ERROR } from "../utils/safeMessages";

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
