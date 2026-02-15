import apiRequest from "../utils/apiClient";

/**
 * Fetch all departments
 * @returns {Promise<Array>} List of departments
 */
export const fetchDepartments = async () => {
  try {
    const response = await apiRequest("GET", "/api/departments");
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch departments");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};

/**
 * Add a new department
 * @param {Object} data - Department data
 * @param {string} data.name - Department name
 * @param {string} data.team - Team name
 * @param {string} data.route - Route path
 * @param {string} data.code - Department code
 * @param {boolean} data.isactive - Active status
 * @returns {Promise<Object>} Created department
 */
export const addDepartment = async (data) => {
  try {
    const response = await apiRequest("POST", "/api/departments", {
      name: data.name,
      team: data.team,
      route: data.route,
      code: data.code,
      isactive: data.isactive,
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to add department");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing department
 * @param {Object} data - Department data
 * @param {number} data.id - Department ID
 * @param {string} data.name - Department name
 * @param {string} data.team - Team name
 * @param {string} data.route - Route path
 * @param {string} data.code - Department code
 * @param {boolean} data.isactive - Active status
 * @returns {Promise<Object>} Updated department
 */
export const updateDepartment = async (data) => {
  try {
    const response = await apiRequest("PUT", "/api/departments", {
      id: data.id,
      name: data.name,
      team: data.team,
      route: data.route,
      code: data.code,
      isactive: data.isactive,
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to update department");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};

/**
 * Toggle department active status
 * @param {number} id - Department ID
 * @param {boolean} isactive - New active status
 * @returns {Promise<Object>} Updated department
 */
export const toggleDepartmentStatus = async (id, isactive) => {
  try {
    const response = await apiRequest("PUT", "/api/departments/toggle-status", {
      id,
      isactive,
    });
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to toggle department status");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a department
 * @param {number} id - Department ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteDepartment = async (id) => {
  try {
    const response = await apiRequest(
      "DELETE",
      `/api/departments/${id}/delete`
    );
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to delete department");
    }
    return response.data || response;
  } catch (error) {
    throw error;
  }
};
