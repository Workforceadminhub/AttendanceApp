import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDepartments } from "../services/departments";
import {
  setDynamicDepartments,
  getEffectiveRouteList,
  ensureSessionRoute,
} from "../utils/routeObject";
import { getUser } from "../utils/getUser";

const DepartmentsContext = createContext({
  departments: [],
  loading: false,
  error: null,
  refetch: async () => {},
});

// Bump this version any time the merge/shape logic in setDynamicDepartments
// changes — guarantees a clean rehydrate for users with stale localStorage.
const CACHE_KEY = "departmentsCache:v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — depts barely change

export const DEPARTMENTS_QUERY_KEY = ["departments"];

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // quota / private-mode — non-fatal
  }
}

export function DepartmentsProvider({ children }) {
  const isAuthed = typeof window !== "undefined" && !!sessionStorage.getItem("accessToken");
  const cached = readCache();
  if (cached) setDynamicDepartments(cached);

  const query = useQuery({
    queryKey: DEPARTMENTS_QUERY_KEY,
    queryFn: async () => {
      const data = await fetchDepartments();
      const arr = Array.isArray(data) ? data : [];
      setDynamicDepartments(arr);
      writeCache(arr);
      return arr;
    },
    enabled: isAuthed,
    initialData: cached || undefined,
    staleTime: 5 * 60 * 1000, // revalidate after 5 min
  });

  // Keep the routeObject's mutable cache in sync if the data updates
  useEffect(() => {
    if (Array.isArray(query.data)) setDynamicDepartments(query.data);
  }, [query.data]);

  const value = useMemo(
    () => ({
      departments: Array.isArray(query.data) ? query.data : [],
      loading: query.isLoading,
      error: query.error,
      refetch: query.refetch,
    }),
    [query.data, query.isLoading, query.error, query.refetch]
  );

  return <DepartmentsContext.Provider value={value}>{children}</DepartmentsContext.Provider>;
}

/**
 * Mutation helper hook: wrap an async dept-CUD operation so the cache
 * invalidates automatically when it succeeds.
 *   const { mutate, isPending } = useDepartmentMutation(addDepartment);
 *   await mutate(formData);
 */
export function useInvalidateDepartments() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY });
}

export function useDepartmentsContext() {
  return useContext(DepartmentsContext);
}

export function useEffectiveRouteList() {
  const { departments } = useDepartmentsContext();
  const authUser = getUser();
  return useMemo(() => {
    if (Array.isArray(departments) && departments.length > 0) {
      setDynamicDepartments(departments);
    }
    if (authUser) {
      ensureSessionRoute(authUser);
    }
    return getEffectiveRouteList();
  }, [departments, authUser?.route, authUser?.department, authUser?.team]);
}

export function useDepartmentRoutes() {
  const list = useEffectiveRouteList();
  return useMemo(() => {
    const attendanceRoutes = list.map((i) => `/attendance${i.route}`);
    const summaryRoutes = list.map((i) => `/summary${i.route}`);
    const dashboardRoutes = list.map((i) => `/dashboard${i.route}`);
    const teamSlugs = Array.from(
      new Set(list.map((i) => `admin/${(i.team || "").toLowerCase().trim().replaceAll(" ", "")}`))
    ).filter((s) => s !== "admin/");
    const adminRoutes = teamSlugs;
    const historyRoutes = teamSlugs.map((s) => `history/${s}`);
    return { attendanceRoutes, summaryRoutes, dashboardRoutes, adminRoutes, historyRoutes };
  }, [list]);
}
