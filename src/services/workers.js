import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { getNextSunday } from "../utils/getDate";
import { WORKER_STATUS } from "../utils/enums";
import apiRequest from "../utils/apiClient";

export const fetchWorkers = async (department, activeDate) => {
  try {
    const dateForAttendance = activeDate || getNextSunday();
    const response = await apiRequest("GET", "/api/workers", {
      department,
      activeDate: dateForAttendance,
      isAdmin: false,
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch workers");
    }

    console.log("Workers data:", response);
    return response.data;
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const fetchUnmarkedWorkers = async (team, activeDate) => {
  try {
    const response = await apiRequest("GET", "/api/unmarked/workers", {
      team,
      activeDate,
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch unmarked workers");
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const fetchAdminWorkers = async (team, activeGroup, activeDate) => {
  try {
    const response = await apiRequest("GET", "/api/workers", {
      team,
      activeGroup,
      activeDate,
      isAdmin: true,
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admin workers");
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const addNewWorker = async (worker) => {
  try {
    const response = await apiRequest("POST", "/api/workers/add", worker);
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to add new worker");
    }
    return response.data;
  } catch (error) {
    console.error("Error adding new worker:", error.message);
    return null;
  }
};

export const removeWorker = async (workerid, deleteData) => {
  try {
    const res = await apiRequest("PUT", `/api/workers/requestDelete`, {
      workerid,
      deleteData,
    });
    if (!res || res.error) {
      throw new Error(res?.error || "Failed to remove worker");
    }
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const useFetchWorkers = (department) => {
  return useQuery({
    queryKey: [department],
    queryFn: () => fetchWorkers(department),
  });
};
