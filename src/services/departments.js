import apiRequest from "../utils/apiClient";
import { setDynamicDepartments, getEffectiveRouteList, isDepartmentActive } from "../utils/routeObject";
import { DISTRICT_CLUSTER_LABELS } from "../utils/teams";
import { fetchHubTeams } from "./hub/teams";

/**
 * Fetch all departments (including empty or unmapped).
 * @returns {Promise<Array>} List of departments
 */
export const fetchDepartments = async () => {
  const response = await apiRequest("GET", "/api/departments");
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to fetch departments");
  }
  const raw = response.data || response;
  const items = Array.isArray(raw) ? raw : [];
  const sorted = [...items].sort((a, b) => {
    const numA = Number(a?.id);
    const numB = Number(b?.id);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
  setDynamicDepartments(sorted);
  return sorted;
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

  const isHiddenTeam = (name) => {
    const norm = String(name || "").trim().toLowerCase();
    return norm === "gbagada campus" || norm === "gbagada";
  };

  const addDeptToTeam = (teamKey, deptName) => {
    if (!teamKey || !deptName) return;
    if (isHiddenTeam(teamKey)) return;
    const normTeam = canonicalTeamName(teamKey);
    const normDept = String(deptName).trim();
    if (!normTeam || !normDept) return;

    // Never treat a team name as a department under that (or any) team
    if (normDept.toLowerCase() === normTeam.toLowerCase()) return;

    if (!isHiddenTeam(normTeam)) {
      teamNamesSet.add(normTeam);
    }
    allDepartmentNames.add(normDept);

    if (!departmentsByTeam[normTeam]) departmentsByTeam[normTeam] = [];
    if (!departmentsByTeam[normTeam].includes(normDept)) {
      departmentsByTeam[normTeam].push(normDept);
    }

    // Also register under original key so lookups by either name work
    const origTeam = String(teamKey).trim();
    if (origTeam !== normTeam && !isHiddenTeam(origTeam)) {
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
      if (name && !isHiddenTeam(name)) teamNamesSet.add(canonicalTeamName(name));
    });
  }

  // Process live departments API data
  const inactiveDepartmentNames = new Set();
  if (Array.isArray(departmentsList) && departmentsList.length > 0) {
    departmentsList.forEach((d) => {
      const name = d?.name ?? d?.department ?? String(d);
      const active = isDepartmentActive(d);
      if (!active) {
        if (name) {
          const norm = String(name).trim().toLowerCase();
          inactiveDepartmentNames.add(norm);
          inactiveDepartmentNames.add(norm.replace(/[^a-z0-9]+/g, "-"));
        }
        if (d?.route) {
          const normRoute = String(d.route).trim().toLowerCase().replace(/^\//, "");
          inactiveDepartmentNames.add(normRoute);
          inactiveDepartmentNames.add(`/${normRoute}`);
        }
        return;
      }
      const team = d?.team ?? d?.teamName;
      addDeptToTeam(team || "(No team)", name);
    });
  }

  // Include any remaining effective-route departments (API-backed once loaded)
  const effectiveList = getEffectiveRouteList();
  effectiveList.forEach((item) => {
    if (
      item.department &&
      !inactiveDepartmentNames.has(String(item.department).trim().toLowerCase())
    ) {
      addDeptToTeam(item.team, item.department);
    }
  });

  const teamNames = [...teamNamesSet]
    .filter((t) => !isHiddenTeam(t))
    .sort();
  const blockedDeptNames = new Set(
    [
      ...teamNames,
      ...DISTRICT_CLUSTER_LABELS,
    ].flatMap((t) => {
      const s = String(t).trim();
      return s ? [s, s.toLowerCase()] : [];
    })
  );

  // Drop team names and district-cluster labels from department lists
  // (e.g. "Districts", "Pastor Biola" appearing as departments).
  Object.keys(departmentsByTeam).forEach((teamKey) => {
    departmentsByTeam[teamKey] = departmentsByTeam[teamKey].filter((dept) => {
      const d = String(dept).trim();
      return (
        d &&
        !blockedDeptNames.has(d) &&
        !blockedDeptNames.has(d.toLowerCase()) &&
        d.toLowerCase() !== String(teamKey).trim().toLowerCase()
      );
    });
  });
  for (const name of [...allDepartmentNames]) {
    if (blockedDeptNames.has(name) || blockedDeptNames.has(name.toLowerCase())) {
      allDepartmentNames.delete(name);
    }
  }

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
};

/**
 * Toggle department active status
 * @param {number} id - Department ID
 * @param {boolean} isactive - New active status
 * @returns {Promise<Object>} Updated department
 */
export const toggleDepartmentStatus = async (id, isactive) => {
  const response = await apiRequest("PUT", "/api/departments/toggle-status", {
    id,
    isactive,
  });
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to toggle department status");
  }
  return response.data || response;
};

/**
 * Delete a department
 * @param {number} id - Department ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteDepartment = async (id) => {
  const response = await apiRequest(
    "DELETE",
    `/api/departments/${id}/delete`
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to delete department");
  }
  return response.data || response;
};
