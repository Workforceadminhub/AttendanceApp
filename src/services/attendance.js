import apiRequest from "../utils/apiClient";
import { getNextSunday } from "../utils/getDate";
import { supabase } from "./supabaseClient";

const table = "attendance";
// const table = "attendance2";
export const addAttendance = async (attendance) => {
  const dateForAttendance = getNextSunday();
  try {
    await supabase
      .from(table)
      .delete()
      .in(
        "workerid",
        attendance.map((item) => item.workerid)
      )
      .eq("attendancedate", dateForAttendance);

    const { data, error } = await supabase.from(table).insert(attendance);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error adding attendance:", error.message);
    return null;
  }
};


export const fetchAdminAttendance = async (
  activeGroup,
  isChurchAdmin,
  activeDate
) => {
  const dateForAttendance = activeDate || getNextSunday();
  try {
    const response = await apiRequest("GET", "/api/attendance/admin", {
      activeGroup,
      activeDate: dateForAttendance,
      isChurchAdmin,
    });

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admin attendance");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching attendance:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const fetchAttendance = async (activeDate) => {
  const dateForAttendance = activeDate || getNextSunday();

  try {
    const response = await apiRequest("GET", "/api/attendance", {
      activeDate: dateForAttendance,
    });

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch attendance");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching attendance:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export function calculateTotals(data) {
  const totals = data?.reduce(
    (acc, item) => {
      acc.present += item.present;
      acc.absent += item.absent;
      acc.total += item.total;
      return acc;
    },
    { present: 0, absent: 0, total: 0 }
  );

  // Calculate the overall percentage
  const overallPercentage =
    totals?.total === 0
      ? "0.00%"
      : ((totals?.present / totals?.total) * 100).toFixed(2) + "%";

  return [
    { name: "Total strength", stat: totals?.total },
    { name: "Total present", stat: totals?.present },
    { name: "Total absent", stat: totals?.absent },
    { name: "Total percentage", stat: overallPercentage },
  ];
}
