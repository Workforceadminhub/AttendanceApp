import apiRequest from "./apiClient";

export const switchOffAttendance = async () => {
  // Logic to switch off attendance
  const data = await apiRequest("PUT", "/api/attendance/close");
  return data.data;
};
