import apiRequest from "../utils/apiClient";

export const fetchHistoryOptions = async () => {
  const data = await apiRequest("GET", "/api/uniquedates");
  if (!data || data.error) {
    throw new Error(data?.error || "Failed to fetch history options");
  }
  return data.data;
  // const { data, error } = await supabase.from('unique_dates').select('*')

  // if (error) {
  //   throw error;
  // }

  // const historyOptions = [
  //   ...new Set(data.map((item) => item.attendancedate)),
  // ].reverse();

  // const sortedDatesHistoryOption = historyOptions.sort((a, b) => {
  //   const dateA = new Date(a.split(" - ")[1].split("/").reverse().join("-"));
  //   const dateB = new Date(b.split(" - ")[1].split("/").reverse().join("-"));
  //   return dateB - dateA;
  // });
  // return sortedDatesHistoryOption;
};
