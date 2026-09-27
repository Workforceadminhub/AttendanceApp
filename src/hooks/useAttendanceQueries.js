import { useQuery } from "@tanstack/react-query";
import { fetchAdminAttendance, fetchAttendance } from "../services/attendance";
import { fetchHistoryOptions } from "../services/history";

/**
 * Attendance summary rows for a date (or date range), cached with React
 * Query. Admin routes read /api/attendance/admin, everyone else
 * /api/attendance. The Dashboard, summary and history pages share this key,
 * so moving between them reuses what was already loaded; saving attendance
 * refreshes it (see invalidateAttendanceQueries).
 */
export function useAttendanceQuery({
  isAdminMember,
  activeGroup,
  isChurchAdmin,
  date = null,
  startDate = null,
  endDate = null,
  permissions,
  enabled = true,
  placeholderData,
}) {
  const permissionsKey = (permissions || []).join(",");
  return useQuery({
    queryKey: [
      "dashboardAttendance",
      isAdminMember ? "admin" : "user",
      activeGroup,
      isChurchAdmin,
      date,
      permissionsKey,
      startDate,
      endDate,
    ],
    queryFn: () =>
      isAdminMember
        ? fetchAdminAttendance(activeGroup, isChurchAdmin, date, startDate, endDate, permissions)
        : fetchAttendance(date, startDate, endDate, permissions),
    enabled,
    placeholderData,
  });
}

// Dates that have attendance (GET /api/uniquedates). A new date appears at
// most weekly, so the list is kept for 30 minutes.
const historyDatesQuery = {
  queryKey: ["historyOptions"],
  queryFn: fetchHistoryOptions,
  staleTime: 30 * 60 * 1000,
};

/** Attendance dates as returned by the API. */
export function useHistoryDates() {
  return useQuery(historyDatesQuery);
}

/** Attendance dates as select options. */
export function useHistoryOptions() {
  return useQuery({
    ...historyDatesQuery,
    select: (dates) => (Array.isArray(dates) ? dates : []).map((item) => ({ label: item, value: item })),
  });
}
