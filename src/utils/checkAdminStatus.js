import { ADMIN_ENUMS } from "./enums";
import { getDepartmentByUser } from "./getDepartment";

export const checkAdminStatus = (pathname) => {
  const team = getDepartmentByUser(pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isSuperAdmin = team.department === "Super Admin";
  const isAdmin = pathname.includes("/admin/") ? true : false;
  return isChurchAdmin || isSuperAdmin || isAdmin;
};
