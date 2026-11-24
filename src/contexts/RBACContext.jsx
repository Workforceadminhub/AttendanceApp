import { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMyRBAC } from "../services/hub/rbac";
import { getAccessToken } from "../utils/authSession";
import { getUserRole } from "../utils/getUserRole";
import { queryKeys } from "../queries/queryKeys";

const RBACContext = createContext(null);

/**
 * Training Hub actions that Super Admin and Church Admin always hold, even when
 * the RBAC payload reports them false.
 */
const ADMIN_TRAINING_ACTIONS = new Set([
  "create_training",
  "mark_training_attendance",
  "nominate_workers",
]);

/**
 * Provides RBAC data from GET /api/hub/rbac/me.
 *
 * - Keyed by the access token, so signing in or out (or as someone else)
 *   never serves the previous user's permissions.
 * - If the call fails the value stays null and `error` is set; consumers
 *   decide whether to fall back or block.
 */
export function RBACProvider({ children }) {
  // Re-render on navigation so a token stored at login is picked up.
  useLocation();
  const token = getAccessToken();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.rbac(token),
    queryFn: async () => {
      const res = await fetchMyRBAC();
      if (res?.success && res.data) return res.data;
      if (res?.role) return res;
      return null;
    },
    enabled: Boolean(token),
  });

  const value = useMemo(
    () => ({
      rbac: token ? data ?? null : null,
      loading: Boolean(token) && isLoading,
      error: token ? error ?? null : null,
      refresh: refetch,
    }),
    [token, data, isLoading, error, refetch]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

/**
 * Full RBAC context.
 * Returns { rbac, loading, error, refresh } or null values if context is unavailable.
 */
export function useRBAC() {
  const ctx = useContext(RBACContext);
  if (!ctx) {
    return { rbac: null, loading: false, error: null, refresh: () => {} };
  }
  return ctx;
}

/**
 * Check if a hub navigation section is visible for the current user.
 * Keys: "dashboard", "trainings", "courses", "admin_panel"
 * Returns false if RBAC is not loaded (graceful degradation).
 */
export function useHubNav(key) {
  const { rbac } = useRBAC();
  if (!rbac?.navigation) return false;
  return rbac.navigation[key] === "full";
}

/**
 * Check if the current user can perform a specific action.
 * Keys: "mark_attendance", "mark_training_attendance", "create_training", "nominate_workers"
 * Returns false if RBAC is not loaded (graceful degradation).
 */
export function useCanAction(action) {
  const { rbac } = useRBAC();

  // Super Admin and Church Admin are organization-wide training managers.
  // Keep this role fallback for the legacy/partial RBAC responses that return
  // these flags as false, while continuing to honor API permissions for every
  // other role and action. Attendance marking and nomination are Admin /
  // Facilitator capabilities, so the console would otherwise be unreachable
  // for the two roles that own it.
  if (ADMIN_TRAINING_ACTIONS.has(action)) {
    const { isSuperAdmin, isChurchAdmin } = getUserRole();
    if (isSuperAdmin || isChurchAdmin) return true;
  }

  if (!rbac?.actions) return false;
  return rbac.actions[action] === true;
}

/**
 * Get the scope filter for data queries.
 * Returns { departmentNames, teamNames, selfWorkerId } or null.
 */
export function useScopeFilter() {
  const { rbac } = useRBAC();
  return rbac?.scope_filter ?? null;
}

export default RBACContext;
