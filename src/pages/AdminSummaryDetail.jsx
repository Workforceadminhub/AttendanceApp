import { useEffect, useState, useMemo } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";
import Header from "../components/Header";
import Layout from "../components/Layout";
import AttendanceLeaderboard from "../components/AttendanceLeaderboard";
import LoadingState from "../components/LoadingState";
import { getDepartmentByUser } from "../utils/getDepartment";
import { getUser } from "../utils/getUser";
import { expandPermissions } from "../utils/expandPermissions";
import { getUserRole } from "../utils/getUserRole";
import {
  getDepartmentRoute,
  getEffectiveRouteList,
  getDepartmentsForTeam,
  filterPermissionsByTeam,
} from "../utils/routeObject";
import { fetchAttendance } from "../services/attendance";
import { fetchAdminWorkers } from "../services/workers";
import { getNextSunday, getSundaysInYear } from "../utils/getDate";

export default function AdminSummaryDetail() {
  const location = useLocation();
  const teamInfo = getDepartmentByUser(location.pathname) || {};

  const authUser = getUser();
  const {
    isSuperAdmin,
    isChurchAdmin,
    isTeamAdmin,
    isAdmin,
  } = getUserRole();
  const canPickTeam = isSuperAdmin;

  // All hooks must be called before any early return (Rules of Hooks)
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedTeam, setSelectedTeam] = useState("");

  useEffect(() => {
    setSelectedDepartment("All");
  }, [selectedTeam]);

  const teamOptions = useMemo(() => {
    if (!canPickTeam) return [];
    return Array.from(
      new Set(getEffectiveRouteList().map((item) => item.team).filter(Boolean))
    ).sort();
  }, [canPickTeam]);

  const teamName = canPickTeam
    ? selectedTeam
    : (teamInfo.team || "All");

  // Use team name as the primary key for analytics (Phase 7 helpers
  // map this to teamName for the backend via resolveDepartmentParams)
  const departmentKey = teamName || "All";

  const departmentOptions = useMemo(() => {
    if (!teamName || teamName === "All") return [];
    const excluded = new Set([
      "Leadership Development",
      "Workforce Growth",
      "Special Ministries",
    ]);
    const depts = getDepartmentsForTeam(teamName);
    return depts.filter((dept) => !excluded.has(dept)).sort();
  }, [teamName]);

  // Attendance Trend: replicate HOD/sub-team-admin pattern:
  // fetch attendance for each Sunday via GET /api/attendance?activeDate=Sunday - d/m/y
  const {
    data: trendsData,
    isLoading: isTrendsLoading,
  } = useQuery({
    queryKey: ["adminSummaryTrendsBySundays", departmentKey, selectedDepartment, 2026],
    queryFn: async () => {
      const allSundays = getSundaysInYear(2026);
      const cutoffDate = sundayToYYYYMMDD(getNextSunday()) || "";
      const sundayStrings = allSundays.filter((s) => {
        const d = sundayToYYYYMMDD(s);
        return d && d <= cutoffDate;
      });
      const permissions = expandPermissions(authUser);
      const selectedDept = selectedDepartment && selectedDepartment !== "All" ? selectedDepartment : null;
      const selectedRoute = selectedDept ? getDepartmentRoute(selectedDept) || selectedDept : null;
      const selectedNormRoute = selectedRoute
        ? selectedRoute.toString().replace(/^\//, "").toLowerCase()
        : null;
      const fetchWithRetry = async (activeDate, attempts = 3) => {
        for (let i = 0; i < attempts; i++) {
          const result = await fetchAttendance(
            activeDate,
            null,
            null,
            permissions
          );
          if (result !== null) return result;
          if (i < attempts - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, 400 * 2 ** i)
            );
          }
        }
        return null;
      };
      const results = new Array(sundayStrings.length);
      const CONCURRENCY = 4;
      for (let i = 0; i < sundayStrings.length; i += CONCURRENCY) {
        const slice = sundayStrings.slice(i, i + CONCURRENCY);
         
        const sliceResults = await Promise.all(slice.map(fetchWithRetry));
        sliceResults.forEach((result, index) => {
          results[i + index] = result;
        });
      }
      const allowedDepartments = new Set(departmentOptions);
      const points = sundayStrings.map((activeDate, i) => {
        const list = results[i];
        const arr = Array.isArray(list) ? list : [];

        const filtered = selectedDept
          ? arr.filter((item) => {
              const name = item.department || item.department_name || "";
              const itemRoute = (
                item.route ||
                item.department_route ||
                item.departmentRoute ||
                ""
              )
                .toString()
                .replace(/^\//, "")
                .toLowerCase();
              return (
                name === selectedDept ||
                (!!selectedNormRoute && itemRoute === selectedNormRoute)
              );
            })
          : canPickTeam
          ? arr.filter((item) => {
              const name = item.department || item.department_name || "";
              return allowedDepartments.has(name);
            })
          : arr;

        const present = filtered.reduce((s, item) => s + (item.present ?? 0), 0);
        const absent = filtered.reduce((s, item) => s + (item.absent ?? 0), 0);
        const date = sundayToYYYYMMDD(activeDate) || activeDate;
        return { date, present, absent };
      });
      return points.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    },
    enabled: canPickTeam ? !!selectedTeam : true,
  });

  const trends = useMemo(
    () => (Array.isArray(trendsData) ? trendsData : []),
    [trendsData]
  );

  // Monthly filter (similar to DepartmentDetail)
  const MONTHS_2026 = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      return {
        value: `2026-${String(m).padStart(2, "0")}`,
        label:
          new Date(2026, i, 1).toLocaleString("en-GB", { month: "long" }) +
          " 2026",
      };
    });
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    if (now.getFullYear() === 2026) {
      return `2026-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    return "2026-01";
  });

  const monthlyTrends = useMemo(
    () =>
      trends.filter((p) => (p.date || "").startsWith(selectedMonth)),
    [trends, selectedMonth]
  );

  // Leaderboard: startDate is always first Sunday of 2026, endDate is last Sunday of selected month
  const leaderboardStartDate = "2026-01-04";
  const leaderboardEndDate = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0);
    const diff = lastDay.getDay();
    const lastSun = new Date(y, m - 1, lastDay.getDate() - diff);
    return lastSun.toISOString().split("T")[0];
  }, [selectedMonth]);

  const {
    data: workersData,
    isLoading: isWorkersLoading,
  } = useQuery({
    queryKey: ["adminSummaryWorkers", departmentKey, selectedDepartment],
    queryFn: async () => {
      const permissions = expandPermissions(authUser);
      const activeDate = getNextSunday();
      const activeGroup =
        canPickTeam && selectedDepartment !== "All"
          ? selectedDepartment
          : "All";
      // Admin workers endpoint already understands team-level filters.
      return fetchAdminWorkers(
        departmentKey,
        activeGroup,
        activeDate,
        "",
        permissions
      );
    },
    enabled: canPickTeam ? !!selectedTeam : true,
  });

  const workersCount = useMemo(
    () => (Array.isArray(workersData) ? workersData.length : 0),
    [workersData]
  );

  const leaderboardPermissions = useMemo(() => {
    const base = expandPermissions(authUser);
    if (!canPickTeam) {
      return Array.isArray(authUser?.permissions) ? authUser.permissions : [];
    }
    if (!selectedTeam) return [];
    if (selectedDepartment && selectedDepartment !== "All") {
      return [selectedDepartment];
    }
    return filterPermissionsByTeam(base, selectedTeam);
  }, [canPickTeam, authUser, selectedTeam, selectedDepartment]);

  // Reuse workers link logic from Header so this card routes to the
  // same workers overview page admins are used to.
  const departmentRouteForUser =
    getDepartmentRoute(authUser?.department)?.replace?.(/^\//, "") || "";

  const workersHref = (() => {
    if (canPickTeam && selectedDepartment !== "All") {
      const route = getDepartmentRoute(selectedDepartment)?.replace(/^\//, "");
      return route ? `/department/${route}/workers` : "/workers/super-admin";
    }
    if (isSuperAdmin) return "/workers/super-admin";
    if (isChurchAdmin) return "/church-admin/workers";
    // Team Admin: use a team-level department workers URL, e.g.
    // /department/ministry/workers for /admin/ministry
    if (isTeamAdmin && authUser?.route) {
      const teamSlug = authUser.route
        .replace(/^\/admin\//, "")
        .replace(/^\//, "");
      return `/department/${teamSlug}/workers`;
    }
    if (departmentRouteForUser) {
      return `/department/${departmentRouteForUser}/workers`;
    }
    return "/attendance/dashboard";
  })();

  // Early returns after all hooks
  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/summary" replace />;
  }

  const leaderboardDepartment =
    selectedDepartment === "All" ? departmentKey : selectedDepartment;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        {/* Page header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-ink-900">
              {teamName ? `${teamName} summary` : "Summary"}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {canPickTeam
                ? "Choose a team and department to view attendance, leaderboard, and workers."
                : "High-level overview for your team with attendance trend, leaderboard, and workers."}
            </p>
          </div>
          {canPickTeam && (
            <div className="mt-4 flex flex-wrap items-center gap-4 sm:mt-0">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="adminSummaryTeamFilter"
                  className="text-sm text-ink-700"
                >
                  Team
                </label>
                <select
                  id="adminSummaryTeamFilter"
                  value={selectedTeam}
                  onChange={(event) => setSelectedTeam(event.target.value)}
                  className="rounded-md border border-ink-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                >
                  <option value="">Select team</option>
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="adminSummaryDepartmentFilter"
                  className="text-sm text-ink-700"
                >
                  Department
                </label>
                <select
                  id="adminSummaryDepartmentFilter"
                  value={selectedDepartment}
                  onChange={(event) =>
                    setSelectedDepartment(event.target.value)
                  }
                  disabled={!selectedTeam}
                  className="rounded-md border border-ink-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10 disabled:cursor-not-allowed disabled:bg-ink-100"
                >
                  <option value="All">All</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="adminSummaryMonthFilter"
                  className="text-sm text-ink-700"
                >
                  Month
                </label>
                <select
                  id="adminSummaryMonthFilter"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-md border border-ink-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                >
                  {MONTHS_2026.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {canPickTeam && !selectedTeam ? (
          <p className="text-sm text-ink-500">
            Select a team to view the summary.
          </p>
        ) : (
          <>
        {/* Attendance Trend */}
        <div className="mb-8 bg-white rounded-lg border shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-ink-900">
              Attendance Trend
            </h2>
            {!canPickTeam && (
              <div className="flex flex-wrap items-center gap-4">
                {departmentOptions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="adminSummaryDepartmentFilter"
                      className="text-sm text-ink-700"
                    >
                      Department
                    </label>
                    <select
                      id="adminSummaryDepartmentFilter"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="rounded-md border border-ink-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                    >
                      <option value="All">All</option>
                      {departmentOptions.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="adminSummaryMonthFilter"
                    className="text-sm text-ink-700"
                  >
                    Month
                  </label>
                  <select
                    id="adminSummaryMonthFilter"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="rounded-md border border-ink-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                  >
                    {MONTHS_2026.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          {isTrendsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingState />
            </div>
          ) : monthlyTrends.length > 0 ? (
            <div className="h-72">
              {/* Simple bar chart: dates on X, present/absent on Y */}
              <AttendanceTrendChart data={monthlyTrends} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-ink-500 text-sm">
              {trends.length === 0
                ? "No attendance trend data yet."
                : "No Sundays in this month with data."}
            </div>
          )}
        </div>

        {/* Attendance Leaderboard */}
        <div className="mb-8">
          <AttendanceLeaderboard
            department={leaderboardDepartment}
            startDate={leaderboardStartDate}
            endDate={leaderboardEndDate}
            limit={5}
            permissions={leaderboardPermissions}
          />
        </div>

        {/* Workers card */}
        <div className="bg-white rounded-lg border shadow p-6">
          <Link
            to={workersHref}
            className="flex items-center justify-between group"
          >
            <div>
              <h2 className="text-lg font-semibold text-ink-900 group-hover:text-ink-900">
                Workers{workersCount ? ` (${workersCount})` : ""}
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                View and manage workers across your team.
              </p>
            </div>
            <span className="text-sm text-ink-500 group-hover:text-ink-900">
              {isWorkersLoading ? "Loading..." : "View all \u2192"}
            </span>
          </Link>
        </div>
          </>
        )}
      </Layout>
    </div>
  );
}

// Lightweight internal chart component reusing the same data shape
// produced by the Sunday-based /api/attendance loop (date, present, absent).
function AttendanceTrendChart({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-ink-500 text-sm">
        No data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length || !label) return null;
            const row = payload.find((p) => p.dataKey === "present")?.payload ?? {};
            return (
              <div className="bg-white border border-ink-200 rounded shadow-lg p-3 text-sm">
                <div className="font-medium text-ink-900 mb-2">{label}</div>
                <div className="text-[#22c55e] font-medium">
                  Present : {row.present ?? 0}
                </div>
                <div className="text-[#ef4444] font-medium">
                  Absent : {row.absent ?? 0}
                </div>
              </div>
            );
          }}
        />
        <Legend
          payload={[
            {
              value: "Present",
              type: "square",
              id: "present",
              color: "#22c55e",
            },
            {
              value: "Absent",
              type: "square",
              id: "absent",
              color: "#ef4444",
            },
          ]}
        />
        <Bar dataKey="present" fill="#22c55e" name="Present" />
        <Bar dataKey="absent" fill="#ef4444" name="Absent" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Local helper: parse "Sunday - d/m/y" to yyyy-MM-dd
function sundayToYYYYMMDD(dateStr) {
  if (!dateStr || !/^Sunday - \d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return null;
  const parts = dateStr.split(" - ")[1].split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  const d = String(day).padStart(2, "0");
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-${d}`;
}
