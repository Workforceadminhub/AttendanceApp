import apiRequest from "../utils/apiClient";

/**
 * Look up a worker by exact phone number (public, no auth).
 * Returns { fullName, email, phoneNumber, campus, leadershipRole } or throws on 404/error.
 * Backend: GET /api/workers/lookup?phone=xxx
 */
export const lookupWorkerByPhone = async (phone) => {
  // Send exactly what the user typed — backend accepts all formats:
  // 08152957065 | 8152957065 | 2348152957065 | +2348152957065
  const trimmed = phone.trim();
  const response = await apiRequest(
    "GET",
    "/api/workers/lookup",
    { phone: trimmed },
    undefined,
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Worker not found.");
  }
  return response.data ?? response;
};

/**
 * Submit a public leadership training registration (no auth required).
 * Backend: POST /api/leadership-registrations
 */
export const submitRegistration = async (data) => {
  const response = await apiRequest(
    "POST",
    "/api/leadership-registrations",
    data,
    undefined,
    false // public endpoint — no Bearer token
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Submission failed. Please try again.");
  }
  return response;
};

/**
 * Fetch registrations for admin view (auth required).
 * Supports server-side filtering + pagination.
 * Backend: GET /super/admin/leadership-registrations?page=1&limit=15&campus=Gbagada&course=BLC&search=Ayodeji
 *
 * Returns: { data: [...], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
 */
export const fetchRegistrations = async ({ page = 1, limit = 15, campus, course, search } = {}) => {
  const params = { page, limit };
  if (campus && campus !== "All Campuses") params.campus = campus;
  if (course && course !== "All Courses") params.course = course;
  if (search && search.trim()) params.search = search.trim();

  const response = await apiRequest(
    "GET",
    "/super/admin/leadership-registrations",
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
