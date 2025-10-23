import { useQuery } from "@tanstack/react-query";
import { getNextSunday } from "../utils/getDate";
import apiRequest from "../utils/apiClient";
import { WORKER_STATUS } from "../utils/enums";

export const fetchWorkers = async (department, activeDate, search = "") => {
  try {
    const dateForAttendance = activeDate || getNextSunday();
    const params = {
      department,
      activeDate: dateForAttendance,
      isAdmin: false,
    };
    
    // Add search parameter if provided
    if (search && search.trim()) {
      params.search = search.trim();
    }
    
    const response = await apiRequest("GET", "/api/workers", params);
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch workers");
    }

    return response.data;
  } catch (error) {
    // Silent error handling
    return null; // You can return null or handle errors differently
  }
};

export const fetchUnmarkedWorkers = async (team, activeDate) => {
  try {
    const dateForAttendance = activeDate || getNextSunday();
    const response = await apiRequest("GET", "/api/unmarked/workers", {
      team,
      activeDate: dateForAttendance,
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch unmarked workers");
    }
    return response.data;
  } catch (error) {
    // Silent error handling
    return null; // You can return null or handle errors differently
  }
};

export const fetchAdminWorkers = async (team, activeGroup, activeDate, search = "") => {
  try {
    const params = {
      team,
      activeGroup,
      activeDate,
      isAdmin: true,
    };
    
    // Add search parameter if provided
    if (search && search.trim()) {
      params.search = search.trim();
    }
    
    const response = await apiRequest("GET", "/api/workers", params);
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admin workers");
    }
    return response.data;
  } catch (error) {
    // Silent error handling
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
    // Silent error handling
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

export const fetchPendingAdd = async () => {
  try {
    const response = await apiRequest("GET", "api/super/admin/workers", {
      status: WORKER_STATUS.PENDING_ADD
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admin workers");
    }
    return response.data;
  } catch (error) {
    // Silent error handling
    return null;
  }
};

export const fetchPendingRemove = async () => {
  try {
    const response = await apiRequest("GET", "api/super/admin/workers", {
      status: WORKER_STATUS.PENDING_DELETE
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch admin workers");
    }
    return response.data;
  } catch (error) {
    // Silent error handling
    return null; // You can return null or handle errors differently
  }
};

export const useFetchWorkers = (department) => {
  return useQuery({
    queryKey: [department],
    queryFn: () => fetchWorkers(department),
  });
};
