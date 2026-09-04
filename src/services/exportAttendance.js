import apiRequest from "../utils/apiClient";

export const exportAttendance = async (attendancedate) => {
  const result = await apiRequest("POST", "/api/super/admin/attendance/export", {
    attendancedate,
  });
  const payload = result?.data;
  if (payload === undefined) {
    throw new Error(result?.error || "Failed to export attendance");
  }
  return payload;
};
