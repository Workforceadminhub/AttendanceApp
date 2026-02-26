import { ulid } from "ulid";
import apiRequest from "../utils/apiClient";
import { getNextSunday } from "../utils/getDate";
import { departmentNameForApi } from "../utils/routeObject";

// const table = "attendance2";
export const addAttendance = async (attendance) => {
  try {
    const mappedAttendance = attendance.map(i => {
      return {...i, id: ulid()}
    })
    const response = await apiRequest("POST", "/api/attendance/add", {
      attendance: mappedAttendance,
    });

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admin attendance");
    }

    return response.data;
  } catch (error) {
    // Silent error handling
    return null; // You can return null or handle errors differently
  }
};

export const fetchAdminAttendance = async (
  activeGroup,
  isChurchAdmin,
  activeDate,
  startDate,
  endDate,
  permissions = []
) => {
  const dateForAttendance = activeDate || getNextSunday();
  try {
    const params = {
      activeGroup,
      activeDate: dateForAttendance,
      isChurchAdmin,
    };
    if (Array.isArray(permissions) && permissions.length > 0) {
      params.permissions = permissions;
    }
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiRequest("GET", "/api/attendance/admin", params);

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admin attendance");
    }

    return response.data;
  } catch (error) {
    // Silent error handling
    return null;
  }
};

export const fetchAttendance = async (activeDate, startDate, endDate, permissions = []) => {
  const dateForAttendance = activeDate || getNextSunday();

  try {
    const params = { activeDate: dateForAttendance };
    if (Array.isArray(permissions) && permissions.length > 0) {
      params.permissions = permissions;
    }
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiRequest("GET", "/api/attendance", params);

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch attendance");
    }

    return response.data;
  } catch (error) {
    // Silent error handling
    return null;
  }
};

export function calculateTotals(data) {
  // Debug: Log attendance data
  
  const totals = data?.reduce(
    (acc, item) => {
      acc.present += item.present;
      acc.absent += item.absent;
      acc.total += item.total;
      return acc;
    },
    { present: 0, absent: 0, total: 0 }
  );

  // Debug: Log calculated totals

  // Calculate the overall percentage
  const overallPercentage =
    totals?.total === 0
      ? "0.00%"
      : ((totals?.present / totals?.total) * 100).toFixed(2) + "%";

  return [
    { name: "Total strength", stat: totals?.total },
    { name: "Total present", stat: totals?.present },
    { name: "Total absent", stat: totals?.absent },
    { name: "Total percentage", stat: overallPercentage },
  ];
}
// ========== Phase 7 - Date Range Functions ==========

/**
 * Fetches attendance data for a specific department within a date range.
 * @param {string} department - Department name
 * @param {string} startDate - ISO date string for range start
 * @param {string} endDate - ISO date string for range end
 * @returns {Promise<Array|null>} Attendance data array or null on error
 */
export const fetchAttendanceByDateRange = async (department, startDate, endDate) => {
  try {
    const response = await apiRequest("GET", "/api/attendance", {
      department: departmentNameForApi(department),
      startDate,
      endDate,
    });

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch attendance by date range");
    }

    return response.data;
  } catch (error) {
    // Silent error handling
    return null;
  }
};

/**
 * Fetches attendance trend data for a department over a date range.
 * @param {string} department - Department name
 * @param {string} startDate - ISO date string for range start
 * @param {string} endDate - ISO date string for range end
 * @returns {Promise<Array|null>} Trend data array or null on error
 */
export const fetchAttendanceTrends = async (department, startDate, endDate) => {
  try {
    const response = await apiRequest("GET", "/api/attendance/trends", {
      department: departmentNameForApi(department),
      startDate,
      endDate,
    });

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch attendance trends");
    }

    const raw = response.data ?? response;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.trends)) return raw.trends;
    return [];
  } catch (error) {
    // Silent error handling
    return [];
  }
};

/**
 * Phase 7 spec: Fetches department attendance from GET /api/departments/:departmentRoute/attendance
 * Returns { department, summary, workers } with summary.present, summary.absent, summary.presentPercentage
 * @param {string} departmentRoute - Department route (e.g. "mincc" or "mincc")
 * @param {string} startDate - ISO date string for range start
 * @param {string} endDate - ISO date string for range end
 * @returns {Promise<Object|null>} { department, summary, workers } or null on error
 */
export const fetchDepartmentAttendance = async (departmentRoute, startDate, endDate) => {
  try {
    const route = departmentRoute?.startsWith("/") ? departmentRoute.slice(1) : departmentRoute;
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const query = params.toString();
    const url = `/api/departments/${route}/attendance${query ? `?${query}` : ""}`;

    const response = await apiRequest("GET", url);

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch department attendance");
    }

    return response.data ?? response;
  } catch (error) {
    return null;
  }
};

/**
 * Fetches attendance leaderboard data for a set of departments via the
 * GET /api/attendance/trends endpoint.
 *
 * @param {string[]} permissions - Array of department names the user has access to
 * @param {string} startDate - ISO date string for range start
 * @param {string} endDate - ISO date string for range end
 * @param {number} [limit=5] - Number of performers per section
 * @returns {Promise<{topPerformers: Array, bottomPerformers: Array}>}
 */
export const fetchAttendanceLeaderboard = async (permissions, startDate, endDate, limit = 5) => {
  const empty = { topPerformers: [], bottomPerformers: [] };
  try {
    const params = {};
    if (Array.isArray(permissions) && permissions.length > 0) {
      params.permissions = permissions;
    }
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (limit) params.limit = limit;

    const response = await apiRequest("GET", "/api/attendance/trends", params);

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch attendance leaderboard");
    }

    const raw = response.data ?? response;
    // Handle { topPerformers, bottomPerformers } or { top, bottom } shapes
    if (raw?.topPerformers || raw?.top) return raw;
    return empty;
  } catch (error) {
    return empty;
  }
};

/**
 * Fetches attendance history records for a set of departments.
 * @param {string[]} permissions - Array of department names the user has access to
 * @param {string} [fromDate] - Start date filter (ISO yyyy-MM-dd)
 * @param {string} [toDate] - End date filter (ISO yyyy-MM-dd)
 * @returns {Promise<Array>} Array of history records or [] on error
 */
export const fetchAttendanceHistory = async (permissions, fromDate, toDate) => {
  try {
    const params = {};
    if (Array.isArray(permissions) && permissions.length > 0) {
      params.permissions = permissions;
    }
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const response = await apiRequest("GET", "/api/attendance/history", params);

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch attendance history");
    }

    const raw = response.data ?? response;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.history)) return raw.history;
    return [];
  } catch (error) {
    return [];
  }
};

// ========== End Phase 7 - Date Range Functions ==========
// merge
