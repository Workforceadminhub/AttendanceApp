import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { getUser } from "../../utils/getUser";
import { getUserRole } from "../../utils/getUserRole";
import { getPostLoginPath } from "../../utils/routeObject";
import { useRBAC } from "../../contexts/RBACContext";
import LoadingState from "../LoadingState";

/**
 * Route guard for hub pages (trainings, courses, certificates, etc.).
 *
 * 1. No auth at all: redirect to /login
 * 2. RBAC still loading: show a loading state, never the page
 * 3. RBAC loaded and navigation[requiredNav] is "hidden": redirect to dashboard
 * 4. RBAC unavailable: only Super Admin and Church Admin pass (they hold the
 *    hub by role); everyone else is asked to retry
 */
export default function HubRoute({ requiredNav, children }) {
  const user = useMemo(() => getUser(), []);
  const { rbac, loading, refresh } = useRBAC();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!rbac) {
    const { isSuperAdmin, isChurchAdmin } = getUserRole(user);
    if (isSuperAdmin || isChurchAdmin) return <>{children}</>;
    return (
      <div role="alert" className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-ink-900">We could not confirm your access.</p>
        <button type="button" className="qc-btn-secondary mt-4" onClick={() => refresh()}>
          Try again
        </button>
      </div>
    );
  }

  if (rbac.navigation && requiredNav && rbac.navigation[requiredNav] === "hidden") {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  return <>{children}</>;
}
