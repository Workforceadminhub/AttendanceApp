import React from "react";
import { Navigate, useParams } from "react-router-dom";

/**
 * Redirect helper for team admins hitting /workers/admin/:teamRoute URLs.
 *
 * Instead of using the Super Admin workers screen (/workers/super-admin),
 * team admins should see the same department-scoped workers view used by
 * HOD/sub-team-admin (DepartmentWorkers + /api/workers).
 *
 * For a URL like /workers/admin/ministry, we redirect to:
 *   /department/ministry/workers
 */
const AdminWorkersRedirect = () => {
  const { teamRoute } = useParams();

  if (!teamRoute) {
    return <Navigate to="/attendance/dashboard" replace />;
  }

  return (
    <Navigate
      to={`/department/${encodeURIComponent(teamRoute)}/workers`}
      replace
    />
  );
};

export default AdminWorkersRedirect;

