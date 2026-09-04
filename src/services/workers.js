import { getNextSunday } from "../utils/getDate";
import apiRequest from "../utils/apiClient";
import { resolveDepartmentParams, departmentNameForApi } from "../utils/routeObject";
// import { WORKER_STATUS } from "../utils/enums";

export const fetchWorkers = async (department, activeDate, permissions, search = "") => {
  const dateForAttendance = activeDate || getNextSunday();
  const params = {
    department: departmentNameForApi(department),
    activeDate: dateForAttendance,
    isAdmin: false,
  };

  if (Array.isArray(permissions) && permissions.length > 0) {
    params.permissions = permissions;
  }
  
  // Add search parameter if provided
  if (search && search.trim()) {
    params.search = search.trim();
  }
  
  const response = await apiRequest("GET", "/api/workers", params);
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to fetch workers");
  }

  return response.data;
};

export const fetchUnmarkedWorkers = async (team, activeDate) => {
  const dateForAttendance = activeDate || getNextSunday();
  const response = await apiRequest("GET", "/api/unmarked/workers", {
    team,
    activeDate: dateForAttendance,
  });
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to fetch unmarked workers");
  }
  return response.data;
};

/** Unmarked workers for a specific department (Dashboard). */
export const fetchAdminWorkers = async (team, activeGroup, activeDate, search = "", permissions = []) => {
  const params = {
    team,
    activeGroup,
    activeDate,
    isAdmin: true,
    ...(Array.isArray(permissions) && permissions.length > 0 ? { permissions } : {}),
  };
  
  // Add search parameter if provided
  if (search && search.trim()) {
    params.search = search.trim();
  }
  
  const response = await apiRequest("GET", "/api/workers", params);
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to fetch admin workers");
  }
  return response.data;
};

export const addNewWorker = async (worker) => {
  // This is a public endpoint, no authentication required
  const response = await apiRequest("POST", "/api/workers/add", worker, undefined, false);
  if (!response || response.error) {
    throw new Error(response?.error || response?.message || "Failed to add new worker");
  }
  return response.data || response;
};

export const removeWorker = async (workerid, deleteData) => {
  const res = await apiRequest("PUT", `/api/workers/requestDelete`, {
    workerid,
    deleteData,
  });
  if (!res || res.error) {
    throw new Error(res?.error || "Failed to remove worker");
  }
  return res.data;
};

const filterByStatus = (workers, status) => {
  if (status === "PENDING_ADD") {
    return workers.filter(
      (w) =>
        w.status === "PENDING_ADD" ||
        w.status === "pending_add" ||
        w.status === "unknown" ||
        !w.status
    );
  }
  return workers.filter(
    (w) =>
      w.status === "PENDING_DELETE" || w.status === "pending_delete"
  );
};

const fetchPendingWorkers = async (status, page = 1, limit = 100, permissions = []) => {
  let result;
  try {
    // Some deployments use this path for all admin levels.
    result = await apiRequest("GET", "/api/super/admin/workers", {
      status,
      limit,
      page,
      sortBy: "team",
      ...(Array.isArray(permissions) && permissions.length > 0 ? { permissions } : {}),
    });
  } catch (e) {
    // Fallback for deployments that expose a generic admin path.
    result = await apiRequest("GET", "/api/admin/workers", {
      status,
      limit,
      page,
      sortBy: "team",
      ...(Array.isArray(permissions) && permissions.length > 0 ? { permissions } : {}),
    });
  }

  let workers = [];
  if (result?.data && Array.isArray(result.data)) {
    workers = result.data;
  } else if (Array.isArray(result)) {
    workers = result;
  } else if (result?.data?.data && Array.isArray(result.data.data)) {
    workers = result.data.data;
  }

  const pendingWorkers = filterByStatus(workers, status);
  const serverPag = result?.pagination || {};
  const hasServerTotals = serverPag.total != null || serverPag.totalPages != null || serverPag.hasNext != null;
  // Without server totals we cannot know the real count: only infer whether
  // another page likely exists from whether this page came back full.
  const hasNext = hasServerTotals
    ? (serverPag.hasNext ?? (serverPag.totalPages != null ? page < serverPag.totalPages : page * limit < serverPag.total))
    : workers.length === limit;
  return {
    data: pendingWorkers,
    pagination: {
      ...serverPag,
      page: serverPag.page ?? page,
      limit: serverPag.limit ?? limit,
      total: serverPag.total ?? null,
      totalPages: serverPag.totalPages ?? (serverPag.total != null ? Math.ceil(serverPag.total / limit) : null),
      hasNext,
      hasPrev: serverPag.hasPrev ?? page > 1,
      // Rows on this page after client-side status filtering (may be fewer than limit).
      filteredCount: pendingWorkers.length,
      pageCount: workers.length,
    },
  };
};

export const fetchPendingAdd = (page = 1, limit = 100, permissions = []) =>
  fetchPendingWorkers("PENDING_ADD", page, limit, permissions);

export const fetchPendingRemove = (page = 1, limit = 100, permissions = []) =>
  fetchPendingWorkers("PENDING_DELETE", page, limit, permissions);


// ========== Phase 7 - New Worker Functions ==========

/**
 * Fetches inactive workers (attendance below threshold).
 * Phase 7 spec: GET /api/analytics/inactive-workers?threshold&departmentRoute&teamName
 * @param {string} [department] - Department name, team name, or "All"
 * @param {number} [threshold=60] - Attendance percentage threshold (workers below this are inactive)
 * @returns {Promise<Object|null>} { count, threshold, inactiveWorkers } or null on error
 */
export const fetchInactiveWorkers = async (department, threshold = 60) => {
  const { departmentRoute, teamName } = resolveDepartmentParams(department || "All");
  const params = { threshold };
  if (departmentRoute) params.departmentRoute = departmentRoute;
  if (teamName) params.teamName = teamName;
  const response = await apiRequest("GET", "/api/analytics/inactive-workers", params);

  if (!response || response.error) {
    throw new Error(response?.error || "Failed to fetch inactive workers");
  }

  const data = response.data ?? response;
  if (Array.isArray(data)) {
    return { count: data.length, threshold, inactiveWorkers: data };
  }
  return data;
};

/**
 * Fetches top/bottom performers (attendance leaderboard).
 * Phase 7 spec: GET /api/analytics/attendance-leaderboard?departmentRoute&teamName&limit&startDate&endDate
 * @param {string} [department] - Department name, team name, or "All"
 * @param {string} [startDate] - ISO date string for range start
 * @param {string} [endDate] - ISO date string for range end
 * @param {number} [limit=3] - Number of performers per section
 * @returns {Promise<Object|null>} { topPerformers: [], bottomPerformers: [] } or null on error
 */
export const fetchTopPerformers = async (department, startDate, endDate, limit = 3) => {
  const empty = { topPerformers: [], bottomPerformers: [] };
  try {
    const { departmentRoute, teamName } = resolveDepartmentParams(department || "All");
    const params = { limit };
    if (departmentRoute) params.departmentRoute = departmentRoute;
    if (teamName) params.teamName = teamName;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiRequest("GET", "/api/analytics/attendance-leaderboard", params);

    if (!response || response.error) {
      return empty;
    }

    const data = response.data ?? response;
    if (data.topPerformers !== undefined) return data;
    if (data.top !== undefined) {
      return { topPerformers: data.top, bottomPerformers: data.bottom ?? [] };
    }
    return data;
  } catch (error) {
    return empty;
  }
};

// ========== End Phase 7 - New Worker Functions ==========
