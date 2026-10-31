import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { getUser } from "../../utils/getUser";
import { getPostLoginPath } from "../../utils/routeObject";
import { useRBAC } from "../../contexts/RBACContext";

/**
 * Route guard for hub pages (trainings, courses, certificates, etc.).
 *
 * 1. No auth at all → redirect to /login
 * 2. RBAC loaded + navigation[requiredNav] is "hidden" → redirect to dashboard
 * 3. RBAC not loaded (legacy login / call failed) → allow access and let
 *    the API enforce permissions server-side (graceful degradation)
 */
export default function HubRoute({ requiredNav, children }) {
  const user = useMemo(() => getUser(), []);
  const { rbac, loading } = useRBAC();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // While RBAC is loading, don't flash a redirect - show children
  // (the page itself will show its own loading state from data queries)
  if (loading) {
    return <>{children}</>;
  }

  // RBAC loaded and this nav section is explicitly hidden → bounce
  if (rbac?.navigation && requiredNav && rbac.navigation[requiredNav] === "hidden") {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  // RBAC not loaded (null) → allow through, API will enforce
  return <>{children}</>;
}
