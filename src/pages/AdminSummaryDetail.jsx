import { useState, useMemo } from "react";
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
import { getUserRole } from "../utils/getUserRole";
import { getDepartmentRoute, routeObject } from "../utils/routeObject";
import { fetchAttendance } from "../services/attendance";
import { fetchAdminWorkers } from "../services/workers";
import { getNextSunday, getSundaysInYear } from "../utils/getDate";

export default function AdminSummaryDetail() {
  const location = useLocation();
  const teamInfo = getDepartmentByUser(location.pathname) || {};
  const teamName = teamInfo.team || "All";

  // deploy

  const authUser = getUser();
  const {
    isSuperAdmin,
    isChurchAdmin,
    isTeamAdmin,
    isAdmin,
  } = getUserRole();

  // All hooks must be called before any early return (Rules of Hooks)
  const [selectedDepartment, setSelectedDepartment] = useState("All");

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
    return routeObject
      .filter((item) => item.team === teamName)
      .filter((item) => !excluded.has(item.department))
      .map((item) => item.department)
      .sort();
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
      const permissions = authUser?.permissions ?? [];
      const selectedDept = selectedDepartment && selectedDepartment !== "All" ? selectedDepartment : null;
      const selectedRoute = selectedDept ? getDepartmentRoute(selectedDept) || selectedDept : null;
      const selectedNormRoute = selectedRoute
        ? selectedRoute.toString().replace(/^\//, "").toLowerCase()
        : null;
      const results = await Promise.all(
        sundayStrings.map((activeDate) =>
          fetchAttendance(activeDate, null, null, permissions)
        )
      );
      const points = sundayStrings.map((activeDate, i) => {
        const list = results[i];
        const arr = Array.isArray(list) ? list : [];

        const filtered = !selectedDept
          ? arr
          : arr.filter((item) => {
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
            });

        const present = filtered.reduce((s, item) => s + (item.present ?? 0), 0);
        const absent = filtered.reduce((s, item) => s + (item.absent ?? 0), 0);
        const date = sundayToYYYYMMDD(activeDate) || activeDate;
        return { date, present, absent };
      });
      return points.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    },
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

  // First and last Sunday of the selected month (backend expects "Sunday - d/m/y")
  const leaderboardStartDate = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const offset = first.getDay() === 0 ? 0 : 7 - first.getDay();
    const firstSun = new Date(y, m - 1, 1 + offset);
    return `Sunday - ${firstSun.getDate()}/${firstSun.getMonth() + 1}/${firstSun.getFullYear()}`;
  }, [selectedMonth]);
  const leaderboardEndDate = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0);
    const diff = lastDay.getDay();
    const lastSun = new Date(y, m - 1, lastDay.getDate() - diff);
    return `Sunday - ${lastSun.getDate()}/${lastSun.getMonth() + 1}/${lastSun.getFullYear()}`;
  }, [selectedMonth]);

  const {
    data: workersData,
    isLoading: isWorkersLoading,
  } = useQuery({
    queryKey: ["adminSummaryWorkers", departmentKey],
    queryFn: async () => {
      const permissions = authUser?.permissions ?? [];
      const activeDate = getNextSunday();
      // Admin workers endpoint already understands team-level filters.
      return fetchAdminWorkers(departmentKey, "All", activeDate, "", permissions);
    },
  });

  const workersCount = useMemo(
    () => (Array.isArray(workersData) ? workersData.length : 0),
    [workersData]
  );

  // Reuse workers link logic from Header so this card routes to the
  // same workers overview page admins are used to.
  const departmentRouteForUser =
    getDepartmentRoute(authUser?.department)?.replace?.(/^\//, "") || "";

  const workersHref = (() => {
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
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              {teamName ? `${teamName} summary` : "Summary"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              High-level overview for your team with attendance trend, leaderboard, and workers.
            </p>
          </div>
        </div>

        {/* Attendance Trend */}
        <div className="mb-8 bg-white rounded-lg border shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance Trend
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              {departmentOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="adminSummaryDepartmentFilter"
                    className="text-sm text-gray-700"
                  >
                    Department
                  </label>
                  <select
                    id="adminSummaryDepartmentFilter"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="text-sm text-gray-700"
                >
                  Month
                </label>
                <select
                  id="adminSummaryMonthFilter"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTHS_2026.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
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
            permissions={authUser?.permissions}
          />
        </div>

        {/* Workers card */}
        <div className="bg-white rounded-lg border shadow p-6">
          <Link
            to={workersHref}
            className="flex items-center justify-between group"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                Workers{workersCount ? ` (${workersCount})` : ""}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View and manage workers across your team.
              </p>
            </div>
            <span className="text-sm text-gray-500 group-hover:text-blue-600">
              {isWorkersLoading ? "Loading..." : "View all \u2192"}
            </span>
          </Link>
        </div>
      </Layout>
    </div>
  );
}

// Lightweight internal chart component reusing the same data shape
// produced by the Sunday-based /api/attendance loop (date, present, absent).
function AttendanceTrendChart({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
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
              <div className="bg-white border border-gray-200 rounded shadow-lg p-3 text-sm">
                <div className="font-medium text-gray-900 mb-2">{label}</div>
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

