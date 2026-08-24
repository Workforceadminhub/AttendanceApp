import { ADMIN_ENUMS } from "./enums";
import { getDepartmentByUser } from "./getDepartment";
import { getUserRole } from "./getUserRole";

export const checkAdminStatus = (pathname) => {
  const { isSuperAdmin, isChurchAdmin } = getUserRole();
  if (isSuperAdmin || isChurchAdmin) return true;

  const team = getDepartmentByUser(pathname);
  // During session expiry/initial hydration there may be no user context yet.
  // Treat that state as a normal non-admin route instead of crashing the page.
  const isChurchDept = team?.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isSuperDept = team?.department === "Super Admin";
  const isAdmin = pathname.includes("/admin/") ? true : false;
  return isChurchDept || isSuperDept || isAdmin;
};
