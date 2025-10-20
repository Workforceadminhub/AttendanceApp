import apiRequest from "./apiClient";

export const disableAttendance = async () => {
  // Logic to switch off attendance
  const data = await apiRequest("PUT", "/api/attendance/disable");
  return data.data;
};
