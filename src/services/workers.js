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

export const fetchPendingAdd = async (page = 1, limit = 100) => {
  try {
    console.log("fetchPendingAdd called with:", { page, limit });
    const accessToken = sessionStorage.getItem("accessToken");
    
    // Use the working endpoint directly
    const endpoint = `https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers?status=PENDING_ADD&limit=${limit}&page=${page}&sortBy=team`;
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      
      // Handle different response structures
      let workers = [];
      if (result.data && Array.isArray(result.data)) {
        workers = result.data;
      } else if (Array.isArray(result)) {
        workers = result;
      } else if (result.data && result.data.data && Array.isArray(result.data.data)) {
        workers = result.data.data;
      }
      
      // Filter for pending add workers
      const pendingWorkers = workers.filter(worker => 
        worker.status === 'PENDING_ADD' || 
        worker.status === 'pending_add' || 
        worker.status === 'unknown' ||
        !worker.status
      );
      
      return {
        data: pendingWorkers,
        pagination: result.pagination || {
          page: page,
          limit: limit,
          total: result.data?.length || pendingWorkers.length,
          totalPages: Math.ceil((result.data?.length || pendingWorkers.length) / limit),
          hasNext: page < Math.ceil((result.data?.length || pendingWorkers.length) / limit),
          hasPrev: page > 1,
        }
      };
    }
    
    return { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  } catch (error) {
    console.error("Error fetching pending add workers:", error);
    return { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  }
};

export const fetchPendingRemove = async (page = 1, limit = 100) => {
  try {
    console.log("fetchPendingRemove called with:", { page, limit });
    const accessToken = sessionStorage.getItem("accessToken");
    
    // Use the working endpoint directly
    const endpoint = `https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com/api/super/admin/workers?status=PENDING_DELETE&limit=${limit}&page=${page}&sortBy=team`;
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      
      // Handle different response structures
      let workers = [];
      if (result.data && Array.isArray(result.data)) {
        workers = result.data;
      } else if (Array.isArray(result)) {
        workers = result;
      } else if (result.data && result.data.data && Array.isArray(result.data.data)) {
        workers = result.data.data;
      }
      
      // Filter for pending remove workers
      const pendingWorkers = workers.filter(worker => 
        worker.status === 'PENDING_DELETE' || 
        worker.status === 'pending_delete'
      );
      
      return {
        data: pendingWorkers,
        pagination: result.pagination || {
          page: page,
          limit: limit,
          total: result.data?.length || pendingWorkers.length,
          totalPages: Math.ceil((result.data?.length || pendingWorkers.length) / limit),
          hasNext: page < Math.ceil((result.data?.length || pendingWorkers.length) / limit),
          hasPrev: page > 1,
        }
      };
    }
    
    return { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  } catch (error) {
    console.error("Error fetching pending remove workers:", error);
    return { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  }
};


export const useFetchWorkers = (department) => {
  return useQuery({
    queryKey: [department],
    queryFn: () => fetchWorkers(department),
  });
};
