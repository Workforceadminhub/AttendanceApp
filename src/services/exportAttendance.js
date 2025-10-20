import apiRequest from "../utils/apiClient";

export const exportAttendance = async (attendancedate) => {
  const result = await apiRequest("POST", "/api/super/admin/attendance/export", {
    attendancedate,
  });
  return result.data;
};
