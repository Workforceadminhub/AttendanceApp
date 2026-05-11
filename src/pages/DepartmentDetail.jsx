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
import { getEffectiveRouteList, getDepartmentRoute, getDepartmentNameFromRoute } from "../utils/routeObject";
import { getUser } from "../utils/getUser";
import { getNextSunday, getSundaysInYear } from "../utils/getDate";
import { fetchAttendance } from "../services/attendance";
import { fetchWorkers } from "../services/workers";
import { getUserRole } from "../utils/getUserRole";
import { fetchDepartments } from "../services/departments";

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

 const departmentInfo = getEffectiveRouteList().find(
 (r) => r.department === decodedDepartment
 );
 const team = departmentInfo?.team || "Unknown Team";
 const departmentRoute = getDepartmentRoute(decodedDepartment) || decodedParam;

 const authUser = getUser();

 // Role information (to detect sub-team-admin)
 const { isSubTeamAdmin, assignedDepartments, user: roleUser } = getUserRole();

 // Sub-team-admin: load departments from API and keep only assigned/permission-based
 const {
 data: allDepartments,
 isLoading: isDepartmentsLoading,
 } = useQuery({
 queryKey: ["departmentsForTrends"],
 queryFn: () => fetchDepartments(),
 enabled: isSubTeamAdmin,
 });

 const permittedDepartments = useMemo(() => {
 if (!isSubTeamAdmin || !Array.isArray(allDepartments)) return [];

 const normalizeRoute = (value) =>
 (value || "").toString().replace(/^\//, "").toLowerCase();

 const assigned = (assignedDepartments || []).map((r) =>
 normalizeRoute(r)
 );

 const permissionsSet = Array.isArray(roleUser?.permissions)
 ? new Set(
 roleUser.permissions
 .map((p) => (p ?? "").toString().trim().toLowerCase())
 .filter(Boolean)
 )
 : null;

 return allDepartments.filter((d) => {
 const name = (d?.name ?? "").toString().trim();
 const route = (d?.route ?? "").toString().trim();
 const routeNorm = normalizeRoute(route);

 const matchRouteAssigned =
 assigned.length > 0 && routeNorm
 ? assigned.includes(routeNorm)
 : false;

 const candidates = [
 name,
 route,
 routeNorm,
 ]
 .map((v) => (v ?? "").toString().trim().toLowerCase())
 .filter(Boolean);

 const matchPermissions =
 permissionsSet && candidates.some((c) => permissionsSet.has(c));

 // If neither assigned routes nor permissions are defined, fall back to allowing all
 if (assigned.length === 0 && !permissionsSet) return true;

 return matchRouteAssigned || matchPermissions;
 });
 }, [isSubTeamAdmin, allDepartments, assignedDepartments, roleUser]);

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
 // Throttle to 4 concurrent /api/attendance calls — firing all 50+ in
 // parallel saturates Lambda concurrency and makes most requests 503.
 // 4 in flight, retry up to 2x per Sunday on transient failure.
 const fetchWithRetry = async (activeDate, attempts = 3) => {
 for (let i = 0; i < attempts; i++) {
 const r = await fetchAttendance(activeDate, null, null, permissions);
 if (r !== null) return r;
 if (i < attempts - 1) await new Promise((res) => setTimeout(res, 400 * 2 ** i));
 }
 return null;
 };
 const results = new Array(sundayStrings.length);
 const CONCURRENCY = 4;
 for (let i = 0; i < sundayStrings.length; i += CONCURRENCY) {
 const slice = sundayStrings.slice(i, i + CONCURRENCY);
 // eslint-disable-next-line no-await-in-loop
 const sliceResults = await Promise.all(slice.map(fetchWithRetry));
 sliceResults.forEach((r, j) => {
 results[i + j] = r;
 });
 }
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
 isError: isWorkersError,
 refetch: refetchWorkers,
 } = useQuery({
 queryKey: ["departmentWorkers", decodedDepartment],
 queryFn: () => {
 const authUser = getUser();
 const permissions = authUser?.permissions ?? [];
 return fetchWorkers(decodedDepartment, undefined, permissions);
 },
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
 const trendsAll = useMemo(() => {
 return trendsData?.points ?? (Array.isArray(trendsData) ? trendsData : []);
 }, [trendsData]);
 const trends = useMemo(() => {
 return trendsAll.filter((p) => (p.date || "").startsWith(selectedMonth));
 }, [trendsAll, selectedMonth]);

 // Frontend leaderboard from same attendance data (per month)
 const rawBySunday = useMemo(() => trendsData?.rawBySunday ?? [], [trendsData]);

 // Sub-team-admin: build per-department trend series from full attendance data
 const trendsByDepartment = useMemo(() => {
 if (!isSubTeamAdmin) return {};
 if (!Array.isArray(permittedDepartments) || permittedDepartments.length === 0) {
 return {};
 }

 const inMonth = rawBySunday.filter(({ dateStr }) =>
 (dateStr || "").startsWith(selectedMonth)
 );

 const normalizeRoute = (value) =>
 (value || "").toString().replace(/^\//, "").toLowerCase();

 const meta = permittedDepartments.map((d) => ({
 name: d.name,
 routeNorm: normalizeRoute(d.route),
 id: d.id,
 }));

 const result = {};
 meta.forEach((m) => {
 result[m.name] = [];
 });

 inMonth.forEach(({ dateStr, list }) => {
 const date = dateStr;
 const arr = Array.isArray(list) ? list : [];

 meta.forEach((m) => {
 const forDept = arr.filter((item) => {
 const itemRoute = normalizeRoute(
 item.route || item.department_route || item.departmentRoute
 );
 const itemName = (item.department || item.department_name || "").toString().trim();

 if (m.routeNorm && itemRoute) {
 return itemRoute === m.routeNorm;
 }

 // Fallback: match by department name
 return m.name && itemName && itemName === m.name;
 });

 if (!forDept.length) return;

 const present = forDept.reduce(
 (s, item) => s + (item.present ?? 0),
 0
 );
 const absent = forDept.reduce(
 (s, item) => s + (item.absent ?? 0),
 0
 );

 result[m.name].push({
 date,
 present,
 absent,
 });
 });
 });

 Object.keys(result).forEach((key) => {
 result[key].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
 });

 return result;
 }, [isSubTeamAdmin, permittedDepartments, rawBySunday, selectedMonth]);

 // Leaderboard: startDate is always first Sunday of 2026, endDate is last Sunday of selected month
 const leaderboardStartDate = "2026-01-04";
 const leaderboardEndDate = useMemo(() => {
 const [y, m] = selectedMonth.split("-").map(Number);
 const lastDay = new Date(y, m, 0);
 const diff = lastDay.getDay();
 const lastSun = new Date(y, m - 1, lastDay.getDate() - diff);
 return lastSun.toISOString().split("T")[0];
 }, [selectedMonth]);

 return (
 <div className="px-4 sm:px-6 lg:px-8 py-8">
 <Header />
 <Layout>
 {/* Department Header */}
 <div className="mb-6">
 <div className="flex items-center gap-2 text-sm text-ink-500 mb-1">
 <Link to="/summary" className="hover:underline">
 Summary
 </Link>
 <span>/</span>
 <span className="font-semibold text-ink-900">{decodedDepartment}</span>
 </div>
 <p className="text-sm text-ink-500">Team: {team}</p>
 </div>

 {/* Attendance Trend Chart(s) */}
 <div className="mb-8 bg-white rounded-lg border shadow p-6">
 <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
 <div className="flex flex-col">
 <h2 className="text-lg font-semibold text-ink-900">
 {isSubTeamAdmin ? "Attendance Trend (My Departments)" : "Attendance Trend"}
 </h2>
 {isSubTeamAdmin && (
 <p className="text-xs text-ink-500 mt-1">
 Showing a separate chart for each department you oversee.
 </p>
 )}
 </div>
 <select
 value={selectedMonth}
 onChange={(e) => setSelectedMonth(e.target.value)}
 className="rounded-md border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 {MONTHS_2026.map((m) => (
 <option key={m.value} value={m.value}>
 {m.label}
 </option>
 ))}
 </select>
 </div>

 {isTrendsLoading || (isSubTeamAdmin && isDepartmentsLoading) ? (
 <div className="h-64 flex items-center justify-center">
 <LoadingState />
 </div>
 ) : isSubTeamAdmin ? (
 <>
 {Array.isArray(permittedDepartments) &&
 permittedDepartments.length > 0 &&
 Object.values(trendsByDepartment).some((series) => series.length > 0) ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {permittedDepartments.map((dept) => {
 const series = trendsByDepartment[dept.name] || [];
 const hasData = series.length > 0;
 return (
 <div
 key={dept.id ?? dept.name}
 className="border rounded-lg p-4 bg-cream"
 >
 <h3 className="text-sm font-semibold text-ink-900 mb-2">
 {dept.name}
 </h3>
 {hasData ? (
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={series}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="date" tick={{ fontSize: 11 }} />
 <YAxis />
 <Tooltip
 content={({ active, payload, label }) => {
 if (!active || !payload?.length || !label) return null;
 const row =
 payload.find((p) => p.dataKey === "present")
 ?.payload ?? {};
 return (
 <div className="bg-white border border-ink-200 rounded shadow-lg p-3 text-sm">
 <div className="font-medium text-ink-900 mb-2">
 {label}
 </div>
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
 </div>
 ) : (
 <div className="h-64 flex items-center justify-center text-ink-500 text-sm">
 No Sundays in this month with data for this department.
 </div>
 )}
 </div>
 );
 })}
 </div>
 ) : (
 <div className="h-64 flex items-center justify-center text-ink-500 text-sm">
 No attendance history for your departments yet.
 </div>
 )}
 </>
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
 ) : (
 <div className="h-64 flex items-center justify-center text-ink-500">
 {trendsAll.length === 0
 ? "No attendance history for Sundays yet."
 : `No Sundays in this month with data.`}
 </div>
 )}
 </div>

 {/* Leaderboard — uses GET /api/attendance/trends with user permissions */}
 <div className="mb-8">
 <AttendanceLeaderboard
 department={decodedDepartment}
 startDate={leaderboardStartDate}
 endDate={leaderboardEndDate}
 limit={5}
 permissions={authUser?.permissions}
 />
 </div>

 {/* Workers link to dedicated page */}
 <div className="bg-white rounded-lg border shadow p-6">
 {isWorkersError ? (
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-brick">
 Workers - failed to load
 </h2>
 <button
 type="button"
 onClick={() => refetchWorkers()}
 className="text-sm text-ink-900 hover:underline"
 >
 Retry
 </button>
 </div>
 ) : (
 <Link
 to={`/department/${departmentRoute || encodeURIComponent(decodedDepartment)}/workers`}
 className="flex items-center justify-between group"
 >
 <h2 className="text-lg font-semibold text-ink-900 group-hover:text-ink-900">
 {isWorkersLoading ? "Workers (…)" : `Workers (${workers.length})`}
 </h2>
 <span className="text-sm text-ink-500 group-hover:text-ink-900">View all →</span>
 </Link>
 )}
 </div>
 </Layout>
 </div>
 );
}
