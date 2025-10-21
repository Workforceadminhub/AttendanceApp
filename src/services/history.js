import apiRequest from "../utils/apiClient";

export const fetchHistoryOptions = async () => {
  // comment
  const data = await apiRequest("GET", "/api/uniquedates");
  if (!data || data.error) {
    throw new Error(data?.error || "Failed to fetch history options");
  }
  return data.data;
};
