import apiRequest from "../utils/apiClient";
import { teamsAndDepartments } from "../utils/teams";

/**
 * Fetch all departments (including empty or unmapped).
 * @returns {Promise<Array>} List of departments
 */
export const fetchDepartments = async () => {
  try {
    const response = await apiRequest("GET", "/api/departments");
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch departments");
    }
    const raw = response.data || response;
    const items = Array.isArray(raw) ? raw : [];
    return items.sort((a, b) => {
      const numA = Number(a?.id);
      const numB = Number(b?.id);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch all teams by deriving unique team names from departments.
 * @returns {Promise<Array<string>>} List of team names
 */
export const fetchTeams = async () => {
  const departments = await fetchDepartments();
  const teamSet = new Set();
  departments.forEach((d) => {
    const t = d?.team ?? d?.teamName;
    if (t != null && String(t).trim() !== "") teamSet.add(String(t).trim());
  });
  return [...teamSet].sort();
};

/**
 * Fetch teams and departments for filter dropdowns (API-led).
 * Returns all teams and departments including empty or unmapped.
 * @returns {Promise<{ teams: Array<{ value: string, label: string }>, departments: Array<{ value: string, label: string }>, departmentsByTeam: Record<string, string[]> }>}
 */
export const fetchTeamsAndDepartmentsForFilter = async () => {
  const [teamsList, departmentsList] = await Promise.all([fetchTeams(), fetchDepartments()]);

  const departmentsByTeam = {};
  const allDepartmentNames = new Set();

  if (Array.isArray(departmentsList) && departmentsList.length > 0) {
    // Rely directly on live API data
    departmentsList.forEach((d) => {
      const name = d?.name ?? d?.department ?? String(d);
      const team = d?.team ?? d?.teamName;
      const teamKey = team != null && String(team).trim() !== "" ? String(team).trim() : "(No team)";
      if (name != null && String(name).trim() !== "") {
        allDepartmentNames.add(String(name).trim());
        if (!departmentsByTeam[teamKey]) departmentsByTeam[teamKey] = [];
        if (!departmentsByTeam[teamKey].includes(name)) departmentsByTeam[teamKey].push(name);
      }
    });
  } else {
    // Seed with static fallback map if API returned empty
    teamsAndDepartments.forEach(({ team, department }) => {
      departmentsByTeam[team] = [...department];
      department.forEach((d) => allDepartmentNames.add(d));
    });
  }

  const teamNamesSet = new Set([
    ...teamsList,
    ...(departmentsByTeam["(No team)"]?.length ? ["(No team)"] : []),
  ]);
  if (teamNamesSet.size === 0) {
    teamsAndDepartments.forEach((t) => teamNamesSet.add(t.team));
  }
  const teamNames = [...teamNamesSet].sort();

  const teams = [
    { value: "All", label: "All Teams" },
    ...teamNames.map((t) => ({ value: t, label: t })),
  ];

  const departments = [
    { value: "All", label: "All Departments" },
    ...[...allDepartmentNames].sort().map((d) => ({ value: d, label: d })),
  ];

  return { teams, departments, departmentsByTeam };
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
    const payload = {
      name: data.name,
      team: data.team,
      route: data.route,
      isactive: data.isactive,
    };
    if (data.code !== undefined && data.code !== null && String(data.code).trim() !== "") {
      payload.code = String(data.code).trim();
    }
    const response = await apiRequest("POST", "/api/departments", payload);
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
 * @param {string} [data.code] - Department code
 * @param {boolean} data.isactive - Active status
 * @returns {Promise<Object>} Updated department
 */
export const updateDepartment = async (data) => {
  try {
    const payload = {
      id: data.id,
      name: data.name,
      team: data.team,
      route: data.route,
      isactive: data.isactive,
    };
    if (data.code !== undefined && data.code !== null && String(data.code).trim() !== "") {
      payload.code = String(data.code).trim();
    }
    const response = await apiRequest("PUT", "/api/departments", payload);
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
