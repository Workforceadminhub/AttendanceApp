import { getUser } from "./getUser";
import { ADMIN_ENUMS } from "./enums";
import { routeObject } from "./routeObject";

/**
 * Permission levels from the backend (new field on user object)
 */
export const PERMISSION_LEVELS = {
  HOD: "HOD",
  SUB_TEAM_ADMIN: "SUB_TEAM_ADMIN",
  TEAM_ADMIN: "TEAM_ADMIN",
  CHURCH_ADMIN: "CHURCH_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
};

/**
 * Gets the current user's role and permission details.
 * Checks `permissionLevel` field first (new backend field),
 * then falls back to existing string-match logic for backward compatibility.
 *
 * @returns {Object} Role information object
 */
export function getUserRole() {
  const user = getUser();

  if (!user) {
    return {
      role: null,
      permissionLevel: null,
      assignedDepartments: [],
      isSuperAdmin: false,
      isChurchAdmin: false,
      isTeamAdmin: false,
      isSubTeamAdmin: false,
      isHOD: false,
      isAdmin: false,
      user: null,
    };
  }

  // Check new permissionLevel field first (from backend)
  const permissionLevel = user.permissionLevel || null;
  const assignedDepartments = user.assignedDepartments || [];

  let isSuperAdmin = false;
  let isChurchAdmin = false;
  let isTeamAdmin = false;
  let isSubTeamAdmin = false;
  let isHOD = false;

  if (permissionLevel) {
    // Use the new permissionLevel field
    isSuperAdmin = permissionLevel === PERMISSION_LEVELS.SUPER_ADMIN;
    isChurchAdmin = permissionLevel === PERMISSION_LEVELS.CHURCH_ADMIN;
    isTeamAdmin = permissionLevel === PERMISSION_LEVELS.TEAM_ADMIN;
    isSubTeamAdmin = permissionLevel === PERMISSION_LEVELS.SUB_TEAM_ADMIN;
    isHOD = permissionLevel === PERMISSION_LEVELS.HOD;
  } else {
    // Fallback to existing string-match logic for backward compatibility
    isSuperAdmin = user.department === "Super Admin";
    isChurchAdmin = user.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
    // Without permissionLevel, we can't distinguish TEAM_ADMIN, SUB_TEAM_ADMIN, or HOD
    // Default non-super/non-church admin users to HOD
    isHOD = !isSuperAdmin && !isChurchAdmin;
  }

  const isAdmin = isSuperAdmin || isChurchAdmin || isTeamAdmin || isSubTeamAdmin;

  // Determine a readable role name
  let role = "HOD";
  if (isSuperAdmin) role = "SUPER_ADMIN";
  else if (isChurchAdmin) role = "CHURCH_ADMIN";
  else if (isTeamAdmin) role = "TEAM_ADMIN";
  else if (isSubTeamAdmin) role = "SUB_TEAM_ADMIN";

  return {
    role,
    permissionLevel,
    assignedDepartments,
    isSuperAdmin,
    isChurchAdmin,
    isTeamAdmin,
    isSubTeamAdmin,
    isHOD,
    isAdmin,
    user,
  };
}

/**
 * Checks if the current user can access a specific department.
 * Super Admin and Church Admin can access all departments.
 * Team Admin can access departments within their team.
 * Sub Team Admin can access their assigned departments.
 * HOD can only access their own department.
 *
 * @param {string} departmentName - The department name to check access for
 * @returns {boolean} Whether the user can access the department
 */
export function canAccessDepartment(departmentName) {
  const { isSuperAdmin, isChurchAdmin, isTeamAdmin, isSubTeamAdmin, assignedDepartments, user } =
    getUserRole();

  // Super Admin and Church Admin can access everything
  if (isSuperAdmin || isChurchAdmin) return true;

  // Sub Team Admin - check assigned departments
  if (isSubTeamAdmin && assignedDepartments.length > 0) {
    return assignedDepartments.includes(departmentName);
  }

  // Team Admin - check if department belongs to their team
  if (isTeamAdmin && user?.team) {
    const deptEntry = routeObject.find((r) => r.department === departmentName);
    return deptEntry?.team === user.team;
  }

  // HOD - can only access their own department
  return user?.department === departmentName;
}

/**
 * Phase 7 spec-compliant: Returns user's permission level as a string.
 * @param {Object} [user] - User object (defaults to getUser())
 * @returns {string|null} "SUPER_ADMIN" | "CHURCH_ADMIN" | "TEAM_ADMIN" | "SUB_TEAM_ADMIN" | "HOD" | null
 */
export function getUserRoleString(userParam) {
  const user = userParam ?? getUser();
  if (!user) return null;

  if (user.permissionLevel) return user.permissionLevel;

  const department = user.team?.department ?? user.department;
  const teamName = user.team?.name;
  if (department === "Super Admin") return "SUPER_ADMIN";
  if (department === "Church Admin" || department === ADMIN_ENUMS.ADMIN_DEPARTMENT) return "CHURCH_ADMIN";
  if (department === teamName) return "TEAM_ADMIN";
  return "HOD";
}

/**
 * Phase 7 spec-compliant: Check if user can access a specific department by route.
 * @param {Object} [user] - User object (defaults to getUser())
 * @param {string} departmentRoute - Department route (e.g. "mincc" or "/mincc") or department name
 * @returns {boolean} Whether the user can access the department
 */
export function canAccessDepartmentByRoute(userParam, departmentRoute) {
  const user = userParam ?? getUser();
  const role = getUserRoleString(user);

  if (role === "SUPER_ADMIN" || role === "CHURCH_ADMIN") return true;
  if (role === "TEAM_ADMIN" && user?.team?.name) {
    const deptEntry = routeObject.find(
      (r) => r.route === departmentRoute || r.route === `/${departmentRoute}` || r.department === departmentRoute
    );
    return deptEntry?.team === user.team.name;
  }
  if (role === "SUB_TEAM_ADMIN") {
    const normalized = departmentRoute?.startsWith("/") ? departmentRoute : `/${departmentRoute}`;
    return user.assignedDepartments?.includes(departmentRoute) || user.assignedDepartments?.includes(normalized);
  }
  if (role === "HOD") {
    return user.route === departmentRoute || user.route === `/${departmentRoute}`;
  }
  return false;
}

export default getUserRole;
