import apiRequest from "../utils/apiClient";

export const enableAttendance = async () => {
  // Logic to switch on attendance
  const data = await apiRequest("PUT", "/api/attendance/enable");
  const payload = data?.data;
  if (payload === undefined) {
    throw new Error(data?.error || "Failed to enable attendance");
  }
  return payload;
};
