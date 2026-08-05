import apiRequest from "../utils/apiClient";
import { setDynamicDepartments, getEffectiveRouteList } from "../utils/routeObject";
import { fetchHubTeams } from "./hub/teams";

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
    setDynamicDepartments(items);
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
 * Fetch all teams from GET /api/hub/teams.
 * @returns {Promise<Array<string>>} List of team names
 */
export const fetchTeams = async () => {
  const options = await fetchHubTeams();
  return options.map((t) => t.value);
};

/**
 * Fetch teams and departments for filter dropdowns (API-led).
 * Returns all teams and departments including empty or unmapped.
 * @returns {Promise<{ teams: Array<{ value: string, label: string }>, departments: Array<{ value: string, label: string }>, departmentsByTeam: Record<string, string[]> }>}
 */
export const fetchTeamsAndDepartmentsForFilter = async () => {
  const [departmentsList, hubTeams] = await Promise.all([
    fetchDepartments(),
    fetchHubTeams().catch(() => []),
  ]);

  const departmentsByTeam = {};
  const allDepartmentNames = new Set();
  const teamNamesSet = new Set();

  // Normalize team names to canonical forms to avoid duplicates
  const canonicalTeamName = (name) => {
    const n = String(name).trim();
    if (n === "District") return "Districts";
    if (n === "Program") return "Programs";
    if (n === "Directional leader") return "Directional Leader";
    return n;
  };

  const addDeptToTeam = (teamKey, deptName) => {
    if (!teamKey || !deptName) return;
    const normTeam = canonicalTeamName(teamKey);
    const normDept = String(deptName).trim();
    if (!normTeam || !normDept) return;

    teamNamesSet.add(normTeam);
    allDepartmentNames.add(normDept);

    if (!departmentsByTeam[normTeam]) departmentsByTeam[normTeam] = [];
    if (!departmentsByTeam[normTeam].includes(normDept)) {
      departmentsByTeam[normTeam].push(normDept);
    }

    // Also register under original key so lookups by either name work
    const origTeam = String(teamKey).trim();
    if (origTeam !== normTeam) {
      if (!departmentsByTeam[origTeam]) departmentsByTeam[origTeam] = [];
      if (!departmentsByTeam[origTeam].includes(normDept)) {
        departmentsByTeam[origTeam].push(normDept);
      }
    }
  };

  // Seed teams from dedicated hub teams API
  if (Array.isArray(hubTeams)) {
    hubTeams.forEach((t) => {
      const name = t?.value ?? t?.label;
      if (name) teamNamesSet.add(canonicalTeamName(name));
    });
  }

  // Process live departments API data
  if (Array.isArray(departmentsList) && departmentsList.length > 0) {
    departmentsList.forEach((d) => {
      const name = d?.name ?? d?.department ?? String(d);
      const team = d?.team ?? d?.teamName;
      addDeptToTeam(team || "(No team)", name);
    });
  }

  // Include any remaining effective-route departments (API-backed once loaded)
  const effectiveList = getEffectiveRouteList();
  effectiveList.forEach((item) => {
    addDeptToTeam(item.team, item.department);
  });

  const teamNames = [...teamNamesSet].sort();

  const teams = [
    { value: "All", label: "All Teams" },
    ...teamNames.map((t) => {
      const hub = Array.isArray(hubTeams)
        ? hubTeams.find((h) => h.value === t || canonicalTeamName(h.value) === t)
        : null;
      return { value: t, label: hub?.label || t };
    }),
  ];

  const departments = [
    { value: "All", label: "All Departments" },
    ...[...allDepartmentNames].sort().map((d) => ({ value: d, label: d })),
  ];

  return {
    teams,
    departments,
    departmentsByTeam,
  };
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
