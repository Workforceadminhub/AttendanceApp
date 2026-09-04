// No longer needed

import apiRequest from "./apiClient";

const FILTER_CACHE_KEY = 'workers_filter_cache';
const CACHE_TIMESTAMP_KEY = 'filter_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Extract unique values from workers data for filter options
 */
const extractFilterData = (workers) => {
  if (!Array.isArray(workers)) return null;

  const departments = new Set();
  const teams = new Set();
  const workerRoles = new Set();
  const maritalStatuses = new Set();
  const genders = new Set();

  workers.forEach(worker => {
    if (worker.department) departments.add(worker.department);
    if (worker.team) teams.add(worker.team);
    if (worker.workerrole) workerRoles.add(worker.workerrole);
    if (worker.maritalstatus) maritalStatuses.add(worker.maritalstatus);
    if (worker.gender) genders.add(worker.gender);
  });

  return {
    departments: Array.from(departments).sort(),
    teams: Array.from(teams).sort(),
    workerRoles: Array.from(workerRoles).sort(),
    maritalStatuses: Array.from(maritalStatuses).sort(),
    genders: Array.from(genders).sort()
  };
};

/**
 * Fetch all workers data for filter extraction
 */
const fetchWorkersForFilters = async () => {
  try {
    const result = await apiRequest("GET", "/api/super/admin/workers", {
      limit: 4000,
    });

    // Handle the API response structure based on your curl example
    let workersData = [];
    
    if (result?.data?.data && Array.isArray(result.data.data)) {
      workersData = result.data.data;
    } else if (result?.data && Array.isArray(result.data)) {
      workersData = result.data;
    } else if (Array.isArray(result)) {
      workersData = result;
    }

    return workersData;
  } catch (error) {
    return [];
  }
};

/**
 * Cache filter data in localStorage
 */
const cacheFilterData = (filterData) => {
  try {
    const cacheData = {
      data: filterData,
      timestamp: Date.now()
    };
    localStorage.setItem(FILTER_CACHE_KEY, JSON.stringify(cacheData));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    // Silent error handling
  }
};

/**
 * Get cached filter data
 */
export const getCachedFilterData = () => {
  try {
    const cachedData = localStorage.getItem(FILTER_CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !timestamp) return null;

    const cacheAge = Date.now() - parseInt(timestamp);
    if (cacheAge > CACHE_DURATION) {
      clearFilterCache();
      return null;
    }

    return JSON.parse(cachedData).data;
  } catch (error) {
    return null;
  }
};

/**
 * Clear filter cache
 */
export const clearFilterCache = () => {
  try {
    localStorage.removeItem(FILTER_CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    // Silent error handling
  }
};

/**
 * Initialize and cache filter data from API
 */
export const initializeFilterData = async () => {
  try {
    // Clear existing cache
    clearFilterCache();
    
    // Fetch workers data
    const workers = await fetchWorkersForFilters();
    
    if (workers.length === 0) {
      return null;
    }

    // Extract filter data
    const filterData = extractFilterData(workers);
    
    if (filterData) {
      // Cache the filter data
      cacheFilterData(filterData);
      return filterData;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Get filter options formatted for react-select
 */
export const getFilterOptions = (filterData) => {
  if (!filterData) return null;

  return {
    departments: [
      { value: "All", label: "All Departments" },
      ...filterData.departments.map(dept => ({ value: dept, label: dept }))
    ],
    teams: [
      { value: "All", label: "All Teams" },
      ...filterData.teams.map(team => ({ value: team, label: team }))
    ],
    workerRoles: [
      { value: "All", label: "All Roles" },
      ...filterData.workerRoles.map(role => ({ value: role, label: role }))
    ],
    maritalStatus: [
      { value: "All", label: "All Status" },
      ...filterData.maritalStatuses.map(status => ({ value: status, label: status }))
    ],
    genders: [
      { value: "All", label: "All Genders" },
      ...filterData.genders.map(gender => ({ value: gender, label: gender }))
    ]
  };
};
