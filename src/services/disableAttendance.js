import apiRequest from "../utils/apiClient";

export const disableAttendance = async () => {
  // Logic to switch off attendance
  const data = await apiRequest("PUT", "/api/attendance/disable");
  const payload = data?.data;
  if (payload === undefined) {
    throw new Error(data?.error || "Failed to disable attendance");
  }
  return payload;
};
