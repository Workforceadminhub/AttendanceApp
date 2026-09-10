import { DEFAULT_PAGE_LIMIT, FETCH_ALL_PAGE_LIMIT, fetchAllPages, unwrapPaginated, extractPaginationMeta } from "../utils/pagination.js";
import { filterWorkersByPlacement } from "../utils/filterWorkers";
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
  
  return requestAllWorkerPages("/api/workers", params);
};

export const fetchUnmarkedWorkers = async (team, activeDate) => {
  const dateForAttendance = activeDate || getNextSunday();
  return requestAllWorkerPages("/api/unmarked/workers", {
    team,
    activeDate: dateForAttendance,
  });
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
  
  return requestAllWorkerPages("/api/workers", params);
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

const requestPendingWorkers = async (status, page, limit, permissions) => {
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

  if (!result || result.error) throw new Error(result?.error || "Failed to fetch pending workers");
  return result;
};

const fetchPendingWorkers = async (status, page = 1, limit = 100, permissions = []) => {
  const result = await requestPendingWorkers(status, page, limit, permissions);
  const unwrapped = unwrapPaginated(result, { page, limit });
  const workers = unwrapped.data;
  const pendingWorkers = filterByStatus(workers, status);
  const serverPag = extractPaginationMeta(result) || {};
  const hasServerTotals = serverPag.total != null || serverPag.totalPages != null || serverPag.total_pages != null || serverPag.hasNext != null || serverPag.has_next != null;
  const hasNext = hasServerTotals ? unwrapped.pagination.hasNext : workers.length === limit;
  return {
    data: pendingWorkers,
    pagination: {
      ...unwrapped.pagination,
      total: serverPag.total != null ? unwrapped.pagination.total : null,
      totalPages: hasServerTotals ? unwrapped.pagination.totalPages : (hasNext ? page + 1 : page),
      hasNext,
      hasPrev: unwrapped.pagination.hasPrev,
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


/** Collect the active pending inbox for export, filtering after the page walk. */
export async function fetchAllPending(status, permissions = []) {
  const rows = await fetchAllPages(({ page, limit }) => requestPendingWorkers(status, page, limit, permissions));
  return filterByStatus(rows, status);
}


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

async function requestAllWorkerPages(endpoint, baseParams) {
  return fetchAllPages(async ({ page, limit }) => {
    const response = await apiRequest("GET", endpoint, { ...baseParams, page, limit });
    if (!response || response.error) throw new Error(response?.error || "Failed to fetch workers");
    return response;
  });
}

async function requestSuperAdminWorkers({ page = 1, limit = DEFAULT_PAGE_LIMIT, search = "", team, department, status, sortBy = "team", permissions } = {}) {
  const params = { page, limit, sortBy };
  if (search && search.trim()) params.search = search.trim();
  if (team && team !== "All") params.team = team;
  if (department && department !== "All") params.department = department;
  if (status) params.status = status;
  if (Array.isArray(permissions) && permissions.length > 0) params.permissions = permissions;
  const result = await apiRequest("GET", "/api/super/admin/workers", params);
  if (!result || result.error) throw new Error(result?.error || "Failed to fetch workers");
  return result;
}

/** Fetch one page of super-admin workers with intersection placement filtering. */
export async function listSuperAdminWorkers({ page = 1, limit = DEFAULT_PAGE_LIMIT, ...options } = {}) {
  const result = await requestSuperAdminWorkers({ ...options, page, limit });
  const unwrapped = unwrapPaginated(result, { page, limit });
  unwrapped.data = filterWorkersByPlacement(unwrapped.data, options);
  return unwrapped;
}

/** Fetch the complete super-admin directory using the same filters as its pages. */
export async function fetchAllSuperAdminWorkers(options = {}) {
  // Filter after collection so an OR-filtered server page with no intersection
  // matches cannot hide matching workers on a later page.
  const rows = await fetchAllPages(({ page, limit }) => requestSuperAdminWorkers({ ...options, page, limit }),
    { pageSize: options.limit || FETCH_ALL_PAGE_LIMIT });
  return filterWorkersByPlacement(rows, options);
}
