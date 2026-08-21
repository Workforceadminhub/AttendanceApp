import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { fetchMyRBAC } from "../services/hub/rbac";
import { getUserRole } from "../utils/getUserRole";

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
 * - On mount (if an accessToken exists) it fetches the user's role,
 *   navigation visibility, allowed actions, and scope filter.
 * - If the call fails (legacy JWT not accepted, network error, etc.)
 *   the context value stays null — every consumer falls back gracefully
 *   and the existing app behaviour is unchanged.
 * - Exposes a `refresh()` to re-fetch after login or role change.
 */
export function RBACProvider({ children }) {
  const [rbac, setRbac] = useState(null);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const { pathname } = useLocation();

  const load = useCallback(async () => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setRbac(null);
      loadedRef.current = false;
      return;
    }

    setLoading(true);
    try {
      const res = await fetchMyRBAC();
      if (res?.success && res.data) {
        setRbac(res.data);
      } else if (res?.role) {
        setRbac(res);
      } else {
        setRbac(null);
      }
      loadedRef.current = true;
    } catch {
      setRbac(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-check on route changes — catches the login→dashboard transition
  // where the token appears mid-session. Skips if already loaded.
  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      if (loadedRef.current) {
        setRbac(null);
        loadedRef.current = false;
      }
      return;
    }
    if (loadedRef.current) return;
    load();
  }, [load, pathname]);

  // Listen for storage changes (login/logout in another tab)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "accessToken" || e.key === "authUser") {
        loadedRef.current = false;
        load();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  const value = {
    rbac,
    loading,
    refresh: load,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

/**
 * Full RBAC context.
 * Returns { rbac, loading, refresh } or null values if context is unavailable.
 */
export function useRBAC() {
  const ctx = useContext(RBACContext);
  if (!ctx) {
    return { rbac: null, loading: false, refresh: () => {} };
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
