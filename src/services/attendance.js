import apiRequest from "../utils/apiClient";
import { getNextSunday } from "../utils/getDate";

function getRandomNumber() {
  const min = 300000;
  const max = 10000000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// const table = "attendance2";
export const addAttendance = async (attendance) => {
  try {
    const mappedAttendance = attendance.map(i => {
      return {...i, id: getRandomNumber()}
    })
    const response = await apiRequest("POST", "/api/attendance/add", {
      attendance: mappedAttendance,
    });

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admin attendance");
    }

    return response.data;
  } catch (error) {
    // Silent error handling
    return null; // You can return null or handle errors differently
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
    // Silent error handling
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
    // Silent error handling
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
