import { isSameDepartment } from "./routeObject";
import { getUserRole } from "./getUserRole";

/**
 * Filter attendance/summary data to only departments in authUser.permissions.
 * Admin status is derived from the session user, never from the URL.
 */

/**
 * For non-admin users, filter list to only items whose department is in authUser.permissions.
 * Admin roles (super, church, team, sub-team) see everything the API returned.
 * Everyone else is limited to their permissions, falling back to their own
 * department. With nothing to match against, nothing is shown.
 *
 * @param {Array<{ department: string }>} list - Attendance or summary list with department field
 * @param {object} authUser - User from sessionStorage (authUser.permissions = array of department names)
 * @returns {Array} Filtered list (or original if admin / no permissions)
 */
export const filterByUserPermissions = (list, authUser) => {
  if (!Array.isArray(list)) return list;
  // Super/Church admin role: see everything (skip the department-allowlist filter)
  if (
    authUser?.role === "super-admin" ||
    authUser?.role === "church-admin" ||
    authUser?.department === "Super Admin" ||
    authUser?.department === "Church Admin" ||
    authUser?.permissions?.includes?.("Super Admin") ||
    authUser?.permissions?.includes?.("Church Admin")
  ) {
    return list;
  }
  if (authUser && getUserRole(authUser).isAdmin) return list;
  const permissions = authUser?.permissions?.length
    ? authUser.permissions
    : [authUser?.department, ...(authUser?.assignedDepartments ?? [])].filter(Boolean);
  if (!permissions.length) return [];
  return list.filter(
    (item) =>
      item.department &&
      permissions.some((permission) => isSameDepartment(permission, item.department))
  );
};
