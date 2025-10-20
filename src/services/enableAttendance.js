import apiRequest from "../utils/apiClient";

export const enableAttendance = async () => {
  // Logic to switch off attendance
  const data = await apiRequest("PUT", "/api/attendance/enable");
  return data.data;
};
