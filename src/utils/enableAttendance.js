import apiRequest from "./apiClient";

export const enableAttendance = async () => {
  // Logic to switch off attendance
  const data = await apiRequest("PUT", "/api/attendance/enable");
  return data.data;
};
