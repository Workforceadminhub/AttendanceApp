/**
 * Non-admin users are those whose route does not include "/admin/".
 * For non-admin users, filter attendance/summary data to only departments in authUser.permissions.
 */

/**
 * @param {string} pathname - Current route pathname
 * @returns {boolean} True if the route is an admin route (has /admin/ in path)
 */
export const isAdminRoute = (pathname) => {
  return pathname?.includes("/admin/") ?? false;
};

/**
 * For non-admin users, filter list to only items whose department is in authUser.permissions.
 * Admin users (path includes /admin/) or users without permissions see all data.
 *
 * @param {Array<{ department: string }>} list - Attendance or summary list with department field
 * @param {object} authUser - User from sessionStorage (authUser.permissions = array of department names)
 * @param {string} pathname - Current route pathname
 * @returns {Array} Filtered list (or original if admin / no permissions)
 */
export const filterByUserPermissions = (list, authUser, pathname) => {
  if (!Array.isArray(list)) return list;
  if (isAdminRoute(pathname)) return list;
  const permissions = authUser?.permissions;
  if (!permissions?.length) return list;
  const allowed = new Set(permissions);
  return list.filter((item) => item.department && allowed.has(item.department));
};
