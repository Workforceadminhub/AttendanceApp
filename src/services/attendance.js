import { ulid } from "ulid";
import apiRequest from "../utils/apiClient";
import { getNextSunday } from "../utils/getDate";

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
  endDate
) => {
  const dateForAttendance = activeDate || getNextSunday();
  try {
    const params = {
      activeGroup,
      activeDate: dateForAttendance,
      isChurchAdmin,
    };
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

export const fetchAttendance = async (activeDate, startDate, endDate) => {
  const dateForAttendance = activeDate || getNextSunday();

  try {
    const params = { activeDate: dateForAttendance };
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
      department,
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
      department,
      startDate,
      endDate,
    });

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch attendance trends");
    }

    return response.data;
  } catch (error) {
    // Silent error handling
    return null;
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

// ========== End Phase 7 - Date Range Functions ==========
// merge
