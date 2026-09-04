/**
 * Filter attendance/summary data to only departments in authUser.permissions.
 * Admin status is derived from the session user, never from the URL.
 */

/**
 * For non-admin users, filter list to only items whose department is in authUser.permissions.
 * Super/Church admin users or users without permissions see all data.
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
    authUser?.department === "Super Admin" ||
    authUser?.department === "Church Admin"
  ) {
    return list;
  }
  const permissions = authUser?.permissions;
  if (!permissions?.length) return list;
  const allowed = new Set(permissions);
  return list.filter((item) => item.department && allowed.has(item.department));
};
