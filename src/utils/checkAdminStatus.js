import { ADMIN_ENUMS } from "./enums";
import { getDepartmentByUser } from "./getDepartment";

export const checkAdminStatus = (pathname) => {
  const team = getDepartmentByUser(pathname);
  const isChurchAdmin = team.department === ADMIN_ENUMS.ADMIN_DEPARTMENT;
  const isAdmin = pathname.includes("/admin/") ? true : false;
  return isChurchAdmin || isAdmin;
};
