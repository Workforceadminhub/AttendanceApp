import { getUser } from "./getUser";
import { ADMIN_ENUMS } from "./enums";
import { getEffectiveRouteList } from "./routeObject";

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

  // Normalize role strings like "sub-team-admin", "Sub Team Head", "sub team admin"
  const normalizeRole = (value) =>
    (value ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-")
      .replace(/-+/g, "-");

  const roleRaw = normalizeRole(user.role);
  const isSubTeamRole =
    roleRaw === "sub-team-admin" ||
    roleRaw === "subteam-admin" ||
    roleRaw === "sub-team-head" ||
    roleRaw === "subteam-head" ||
    roleRaw === "sub-teamadmin" ||
    roleRaw === "subteamadmin" ||
    roleRaw === "subteamhead";
  const isTeamAdminRole =
    roleRaw === "team-admin" ||
    roleRaw === "teamadmin" ||
    roleRaw === "team-head" ||
    roleRaw === "teamhead" ||
    roleRaw === "admin";
  const isChurchAdminRole =
    roleRaw === "church-admin" ||
    roleRaw === "churchadmin" ||
    roleRaw === "church-administrator" ||
    roleRaw === "churchadministrator" ||
    (user.department ?? "").toString().trim() === ADMIN_ENUMS.ADMIN_DEPARTMENT ||
    (user.permissionLevel ?? "").toString().trim() === PERMISSION_LEVELS.CHURCH_ADMIN;
  const isSuperAdminRole = roleRaw === "super-admin" || roleRaw === "superadmin";
  const isHodRole = roleRaw === "hod" || roleRaw === "head-of-department";

  // Check new permissionLevel field first (from backend)
  const permissionLevel =
    user.permissionLevel ||
    (isSuperAdminRole
      ? PERMISSION_LEVELS.SUPER_ADMIN
      : isChurchAdminRole
        ? PERMISSION_LEVELS.CHURCH_ADMIN
        : isTeamAdminRole
          ? PERMISSION_LEVELS.TEAM_ADMIN
          : isSubTeamRole
            ? PERMISSION_LEVELS.SUB_TEAM_ADMIN
            : isHodRole
              ? PERMISSION_LEVELS.HOD
              : null);

  // Some older logins don’t include assignedDepartments for sub-team-admin.
  // Default to at least the user's own route/department so access checks and filters work.
  const assignedDepartments = (() => {
    const raw = Array.isArray(user.assignedDepartments) ? user.assignedDepartments : [];
    if (raw.length > 0) return raw;
    if (!isSubTeamRole) return [];
    const fallback = [];
    if (user.route) fallback.push(user.route);
    if (user.department) fallback.push(user.department);
    return fallback;
  })();

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
    // Without permissionLevel, fall back to role string if present; otherwise default to HOD
    isSubTeamAdmin = isSubTeamRole;
    isTeamAdmin = isTeamAdminRole;
    isHOD = (!isSuperAdmin && !isChurchAdmin && !isTeamAdmin && !isSubTeamAdmin) || isHodRole;
  }

  // Department / role can still mark campus-wide admins when permissionLevel is
  // missing, stale, or only set on one of the fields (e.g. Add Worker guards).
  if (user.department === "Super Admin" || isSuperAdminRole) {
    isSuperAdmin = true;
  }
  if (user.department === ADMIN_ENUMS.ADMIN_DEPARTMENT || isChurchAdminRole) {
    isChurchAdmin = true;
  }

  // Enforce strict role hierarchy scoping so higher roles clear lower flags
  if (isSuperAdmin) {
    isChurchAdmin = false;
    isTeamAdmin = false;
    isSubTeamAdmin = false;
    isHOD = false;
  } else if (isChurchAdmin) {
    isTeamAdmin = false;
    isSubTeamAdmin = false;
    isHOD = false;
  } else if (isTeamAdmin) {
    isSubTeamAdmin = false;
    isHOD = false;
  } else if (isSubTeamAdmin) {
    isHOD = false;
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
  if (isSubTeamAdmin) {
    const raw = (departmentName ?? "").toString();
    const name = raw.trim();
    if (!name) return false;

    // For sub-team-admin, backend may provide either:
    // - assignedDepartments (routes and/or names)
    // - permissions (department names)
    const assigned = [
      ...(Array.isArray(assignedDepartments) ? assignedDepartments : []),
      ...(Array.isArray(user?.permissions) ? user.permissions : []),
    ]
      .map((d) => (d ?? "").toString().trim())
      .filter(Boolean);

    const normalize = (s) => s.toLowerCase();

    const candidates = new Set();
    candidates.add(name);
    candidates.add(name.startsWith("/") ? name.slice(1) : name);
    candidates.add(name.startsWith("/") ? name : `/${name}`);

    // If given a department name, also add its route as a candidate
    const list = getEffectiveRouteList();
    const deptEntry =
      list.find((r) => r.department === name) ||
      list.find((r) => normalize(r.department) === normalize(name));
    if (deptEntry?.route) {
      const r = deptEntry.route.toString().trim();
      candidates.add(r);
      candidates.add(r.startsWith("/") ? r.slice(1) : r);
      candidates.add(r.startsWith("/") ? r : `/${r}`);
    }

    const assignedSet = new Set(assigned.map(normalize));
    for (const c of candidates) {
      if (assignedSet.has(normalize(c))) return true;
    }
    return false;
  }

  // Team Admin - check if department belongs to their team
  if (isTeamAdmin && user?.team) {
    const deptEntry = getEffectiveRouteList().find((r) => r.department === departmentName);
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

  const normalizeRole = (value) =>
    (value ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-")
      .replace(/-+/g, "-");
  const roleRaw = normalizeRole(user.role);
  if (
    roleRaw === "sub-team-admin" ||
    roleRaw === "subteam-admin" ||
    roleRaw === "sub-team-head" ||
    roleRaw === "subteam-head" ||
    roleRaw === "sub-teamadmin" ||
    roleRaw === "subteamadmin" ||
    roleRaw === "subteamhead"
  ) {
    return "SUB_TEAM_ADMIN";
  }
  if (
    roleRaw === "team-admin" ||
    roleRaw === "teamadmin" ||
    roleRaw === "team-head" ||
    roleRaw === "teamhead" ||
    roleRaw === "admin"
  ) {
    return "TEAM_ADMIN";
  }

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
    const deptEntry = getEffectiveRouteList().find(
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

/**
 * Filters out the team name from permissions array.
 * Team names shouldn't be in permissions since they're already specified
 * via the department/team parameter in API calls.
 *
 * @param {Array<string>} permissions - Array of permission strings
 * @param {string} teamName - The team name to filter out
 * @returns {Array<string>} Filtered permissions array without team name
 */
export function filterTeamFromPermissions(permissions, teamName) {
  if (!Array.isArray(permissions) || !teamName) return permissions;
  return permissions.filter((perm) => perm !== teamName);
}

export default getUserRole;
