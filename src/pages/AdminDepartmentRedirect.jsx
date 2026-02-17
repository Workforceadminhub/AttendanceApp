import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { getUserRole } from "../utils/getUserRole";

/**
 * Redirect helper for team admins hitting legacy/alternate URLs like:
 * - /department/admin/:teamRoute
 * - /department/admin/:teamRoute/workers
 *
 * For team admins, we map these to the existing admin routes:
 * - /dashboard/admin/:teamRoute
 * - /attendance/admin/:teamRoute
 *
 * Non–team-admin users are redirected to the home page.
 */
const AdminDepartmentRedirect = ({ targetPrefix }) => {
  const { teamRoute } = useParams();
  const { isTeamAdmin } = getUserRole();

  if (!isTeamAdmin) {
    return <Navigate to="/" replace />;
  }

  const normalizedTeamRoute = encodeURIComponent(teamRoute || "");
  const targetPath = `/${targetPrefix}/admin/${normalizedTeamRoute}`;

  return <Navigate to={targetPath} replace />;
};

export default AdminDepartmentRedirect;

