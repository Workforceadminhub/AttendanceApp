import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Header from "../components/Header";
import Layout from "../components/Layout";
import AttendanceLeaderboard from "../components/AttendanceLeaderboard";
import LoadingState from "../components/LoadingState";
import { routeObject, getDepartmentRoute, getDepartmentNameFromRoute } from "../utils/routeObject";
import { getUserRole } from "../utils/getUserRole";
import { getUser } from "../utils/getUser";
import { getNextSunday, getSundaysInYear } from "../utils/getDate";
import { fetchAttendance } from "../services/attendance";
import { fetchWorkers } from "../services/workers";

/** Parse "Sunday - d/m/y" to yyyy-MM-dd */
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

export default function DepartmentDetail() {
  const { departmentRoute: routeParam } = useParams();
  const decodedParam = decodeURIComponent(routeParam || "");

  // Resolve: param can be department route (e.g. "mincc") or department name (backward compat)
  const departmentNameFromRoute = getDepartmentNameFromRoute(decodedParam);
  const decodedDepartment = departmentNameFromRoute || decodedParam;

  const departmentInfo = routeObject.find(
    (r) => r.department === decodedDepartment
  );
  const team = departmentInfo?.team || "Unknown Team";
  const departmentRoute = getDepartmentRoute(decodedDepartment) || decodedParam;

  // Attendance Trend: fetch attendance for every Sunday via GET /api/attendance?activeDate=Sunday - d/m/y
  const {
    data: trendsData,
    isLoading: isTrendsLoading,
  } = useQuery({
    queryKey: ["departmentTrendsBySundays", decodedDepartment, 2026],
    queryFn: async () => {
      const allSundays = getSundaysInYear(2026);
      const cutoffDate = sundayToYYYYMMDD(getNextSunday()) || "";
      const sundayStrings = allSundays.filter((s) => {
        const d = sundayToYYYYMMDD(s);
        return d && d <= cutoffDate;
      });
      const authUser = getUser();
      const permissions = authUser?.permissions ?? [];
      const results = await Promise.all(
        sundayStrings.map((activeDate) =>
          fetchAttendance(activeDate, null, null, permissions)
        )
      );
      const normRoute = (departmentRoute || "").replace(/^\//, "").toLowerCase();
      const points = sundayStrings.map((activeDate, i) => {
        const list = results[i];
        const arr = Array.isArray(list) ? list : [];
        const forDept = arr.filter((item) => {
          const name = item.department || item.department_name || "";
          const itemRoute = (item.route || item.department_route || item.departmentRoute || "").replace(/^\//, "").toLowerCase();
          return name === decodedDepartment || (normRoute && itemRoute === normRoute);
        });
        const present = forDept.reduce((s, item) => s + (item.present ?? 0), 0);
        const absent = forDept.reduce((s, item) => s + (item.absent ?? 0), 0);
        const date = sundayToYYYYMMDD(activeDate) || activeDate;
        return { date, present, absent };
      });
      const rawBySunday = sundayStrings.map((activeDate, i) => ({
        dateStr: sundayToYYYYMMDD(activeDate) || "",
        list: Array.isArray(results[i]) ? results[i] : [],
      }));
      return {
        points: points.sort((a, b) => (a.date || "").localeCompare(b.date || "")),
        rawBySunday,
      };
    },
    enabled: !!decodedDepartment,
  });

  const {
    data: workersData,
    isLoading: isWorkersLoading,
  } = useQuery({
    queryKey: ["departmentWorkers", decodedDepartment],
    queryFn: () => fetchWorkers(decodedDepartment),
  });

  const workers = workersData || [];

  // Attendance Trend: filter by selected month (2026)
  const MONTHS_2026 = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      return { value: `2026-${String(m).padStart(2, "0")}`, label: new Date(2026, i, 1).toLocaleString("en-GB", { month: "long" }) + " 2026" };
    });
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    if (now.getFullYear() === 2026) return `2026-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return "2026-01";
  });
  const trendsAll = trendsData?.points ?? (Array.isArray(trendsData) ? trendsData : []);
  const trends = useMemo(() => {
    return trendsAll.filter((p) => (p.date || "").startsWith(selectedMonth));
  }, [trendsAll, selectedMonth]);

  // Frontend leaderboard from same attendance data (per month)
  const rawBySunday = trendsData?.rawBySunday ?? [];
  const leaderboardFromAttendance = useMemo(() => {
    const normRoute = (departmentRoute || "").replace(/^\//, "").toLowerCase();
    const matchDept = (item) => {
      const name = item.department || item.department_name || "";
      const itemRoute = (item.route || item.department_route || item.departmentRoute || "").replace(/^\//, "").toLowerCase();
      return name === decodedDepartment || (normRoute && itemRoute === normRoute);
    };
    const inMonth = rawBySunday.filter(({ dateStr }) => dateStr.startsWith(selectedMonth));
    const byWorker = new Map();
    for (const { list } of inMonth) {
      const forDept = (list || []).filter(matchDept);
      for (const item of forDept) {
        const id = item.id ?? item.workerId ?? item.worker_id ?? null;
        if (id == null) continue;
        if (!byWorker.has(id)) {
          byWorker.set(id, {
            id,
            firstname: item.firstname ?? item.firstName ?? "",
            lastname: item.lastname ?? item.lastName ?? "",
            presentCount: 0,
            totalSundays: 0,
          });
        }
        const w = byWorker.get(id);
        w.presentCount += Number(item.present ?? 0) >= 1 ? 1 : 0;
        w.totalSundays += 1;
      }
    }
    const withRate = Array.from(byWorker.values())
      .filter((w) => w.totalSundays > 0)
      .map((w) => ({
        ...w,
        attendanceRate: `${Math.round((w.presentCount / w.totalSundays) * 100)}%`,
      }));
    withRate.sort((a, b) => (b.presentCount / b.totalSundays) - (a.presentCount / a.totalSundays));
    const limit = 5;
    const top = withRate.slice(0, limit);
    const bottom = withRate.slice(-limit).reverse();
    return { topPerformers: top, bottomPerformers: bottom };
  }, [rawBySunday, selectedMonth, decodedDepartment, departmentRoute]);

  // Leaderboard: same month as trend; first and last day of selected month
  const leaderboardStartDate = useMemo(() => `${selectedMonth}-01`, [selectedMonth]);
  const leaderboardEndDate = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
  }, [selectedMonth]);

  const { isSuperAdmin, isChurchAdmin, isHOD, isTeamAdmin, isSubTeamAdmin } = getUserRole();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        {/* Department Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/summary" className="hover:underline">
              Summary
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-900">{decodedDepartment}</span>
          </div>
          <p className="text-sm text-gray-500">Team: {team}</p>
        </div>

        {/* Attendance Trend Chart */}
        <div className="mb-8 bg-white rounded-lg border shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance Trend
            </h2>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS_2026.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {isTrendsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingState />
            </div>
          ) : trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length || !label) return null;
                    const row = payload.find((p) => p.dataKey === "present")?.payload ?? {};
                    return (
                      <div className="bg-white border border-gray-200 rounded shadow-lg p-3 text-sm">
                        <div className="font-medium text-gray-900 mb-2">{label}</div>
                        <div className="text-[#22c55e] font-medium">Present : {row.present ?? 0}</div>
                        <div className="text-[#ef4444] font-medium">Absent : {row.absent ?? 0}</div>
                      </div>
                    );
                  }}
                />
                <Legend payload={[{ value: "Present", type: "square", id: "present", color: "#22c55e" }, { value: "Absent", type: "square", id: "absent", color: "#ef4444" }]} />
                <Bar dataKey="present" fill="#22c55e" name="Present" />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              {trendsAll.length === 0 ? "No attendance history for Sundays yet." : `No Sundays in this month with data.`}
            </div>
          )}
        </div>

        {/* Leaderboard (from frontend attendance data for selected month) */}
        <div className="mb-8">
          <AttendanceLeaderboard
            department={decodedDepartment}
            startDate={leaderboardStartDate}
            endDate={leaderboardEndDate}
            limit={5}
            data={leaderboardFromAttendance}
            isLoading={isTrendsLoading}
          />
        </div>

        {/* Workers link to dedicated page */}
        <div className="bg-white rounded-lg border shadow p-6">
          <Link
            to={`/department/${departmentRoute || encodeURIComponent(decodedDepartment)}/workers`}
            className="flex items-center justify-between group"
          >
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              Workers ({workers.length})
            </h2>
            <span className="text-sm text-gray-500 group-hover:text-blue-600">View all →</span>
          </Link>
        </div>
      </Layout>
    </div>
  );
}
