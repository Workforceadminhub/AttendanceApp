import { useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
 LineChart,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
} from "recharts";
import Header from "../components/Header";
import Layout from "../components/Layout";
import LoadingState from "../components/LoadingState";
import Stat from "../components/ui/Stat";
import { fetchWorkers } from "../services/workers";
import { getSundaysInYear } from "../utils/getDate";
import { getDepartmentRoute } from "../utils/routeObject";
import { getUser } from "../utils/getUser";

/** Parse "Sunday - d/m/y" → "d/m" short label for chart axis */
function sundayToShortLabel(dateStr) {
 if (!dateStr) return "";
 const match = dateStr.match(/^Sunday - (\d{1,2})\/(\d{1,2})\/\d{4}$/);
 if (!match) return dateStr;
 return `${match[1]}/${match[2]}`;
}

/** Chart Y-axis: numeric rank per status (stable module constants for hooks deps) */
const STATUS_MAP = { Present: 3, Online: 2, Absent: 1 };
const STATUS_LABELS = { 3: "Present", 2: "Online", 1: "Absent" };

async function mapWithConcurrency(items, worker, concurrency = 4) {
 const results = new Array(items.length);
 let cursor = 0;
 const run = async () => {
  while (cursor < items.length) {
   const index = cursor++;
   results[index] = await worker(items[index], index);
  }
 };
 await Promise.all(
  Array.from({ length: Math.min(concurrency, items.length) }, () => run())
 );
 return results;
}

/** Parse "Sunday - d/m/y" → "Sunday d, Month yyyy" for the log table */
function sundayToDisplayDate(dateStr) {
 if (!dateStr) return "";
 const match = dateStr.match(/^Sunday - (\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if (!match) return dateStr;
 const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
 const month = d.toLocaleDateString("en-GB", { month: "short" });
 return `${match[1]} ${month} ${match[3]}`;
}

export default function WorkerAttendanceHistory() {
 const { workerId } = useParams();
 const [searchParams] = useSearchParams();
 const department = searchParams.get("department") || "";
 const team = searchParams.get("team") || "";

 const authUser = getUser();
 const permissions = authUser?.permissions ?? [];

 // All Sundays from Jan 1 of the current year up to today (chronological)
 const sundays = useMemo(() => {
 // getSundaysInYear() without arg → Jan 1 to today, most-recent-first
 // Reverse to chronological order for the chart
 return getSundaysInYear().reverse();
 }, []);

 // Fetch workers for each Sunday in parallel to get per-worker attendance
 const { data: attendanceByDate, isLoading } = useQuery({
 queryKey: ["workerAttendanceByDate", workerId, department, sundays.length],
 queryFn: async () => {
 // Keep the history view from opening dozens of connections at once. The
 // attendance API is shared with the dashboard and can return transient 503s
 // when the full year is requested in parallel.
 const results = await mapWithConcurrency(
  sundays,
  (sunday) => fetchWorkers(department, sunday, permissions).catch(() => null),
  4
 );
 return sundays.map((sunday, i) => ({ sunday, workers: results[i] }));
 },
 enabled: !!workerId && !!department,
 });

 // Extract target worker's attendance from each Sunday's response
 const { records, workerInfo } = useMemo(() => {
 if (!attendanceByDate) return { records: [], workerInfo: null };

 let foundWorker = null;
 const recs = [];

 for (const { sunday, workers } of attendanceByDate) {
 if (!Array.isArray(workers)) continue;
 const match = workers.find(
 (w) => String(w.id) === String(workerId) || String(w.workerid) === String(workerId)
 );
 if (match) {
 if (!foundWorker) foundWorker = match;
 const status = (match.attendance || "").toString().trim();
 if (status) {
 recs.push({ date: sunday, status });
 }
 }
 }

 return { records: recs, workerInfo: foundWorker };
 }, [attendanceByDate, workerId]);

 // Worker display info
 const workerName = workerInfo
 ? `${workerInfo.firstname || ""} ${workerInfo.lastname || ""}`.trim()
 : "";
 const workerDept = workerInfo?.department || department;
 const workerTeam = workerInfo?.team || team;

 // Summary stats
 const stats = useMemo(() => {
 const total = records.length;
 const present = records.filter((r) => r.status === "Present").length;
 const online = records.filter((r) => r.status === "Online").length;
 const absent = records.filter(
 (r) => r.status !== "Present" && r.status !== "Online"
 ).length;
 const attended = present + online;
 const rate = total === 0 ? "0%" : `${((attended / total) * 100).toFixed(1)}%`;
 return { totalServices: total, timesPresent: present, timesOnline: online, timesAbsent: absent, attendanceRate: rate };
 }, [records]);

 // Chart data: status per Sunday (Present=3, Online=2, Absent=1)
 const chartData = useMemo(
 () =>
 records.map((r) => ({
 date: sundayToShortLabel(r.date),
 Status: STATUS_MAP[r.status] ?? 1,
 })),
 [records]
 );

 // Table: latest first + pagination
 const PAGE_SIZE = 10;
 const [currentPage, setCurrentPage] = useState(1);
 const reversedRecords = useMemo(() => [...records].reverse(), [records]);
 const totalPages = Math.ceil(reversedRecords.length / PAGE_SIZE);
 const paginatedRecords = useMemo(
 () => reversedRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
 [reversedRecords, currentPage]
 );

 return (
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div className="mb-6">
 <div className="qc-num text-2xs uppercase tracking-tag text-ink-500 mb-2 flex items-center gap-2 flex-wrap">
 <Link to="/attendance/summary" className="hover:text-ink-900">
 Summary
 </Link>
 <span className="text-ink-300">/</span>
 {workerDept && (
 <>
 <Link
 to={`/department/${getDepartmentRoute(workerDept) || encodeURIComponent(workerDept)}`}
 className="hover:text-ink-900"
 >
 {workerDept}
 </Link>
 <span className="text-ink-300">/</span>
 </>
 )}
 <span className="text-ink-700">Attendance history</span>
 </div>
 <h1 className="text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
 {workerName || "Worker attendance"}
 </h1>
 {workerDept && (
 <p className="mt-1 text-sm text-ink-500">
 {workerDept}{workerTeam ? ` · ${workerTeam}` : ""} ·{" "}
 <span className="qc-num text-ink-700">
 {new Date().getFullYear()}
 </span>{" "}
 year to date
 </p>
 )}
 </div>

 {isLoading ? (
 <div className="mt-12">
 <LoadingState />
 </div>
 ) : (
 <>
 {/* Stats Summary */}
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
 {[
 { name: "Total services", stat: stats.totalServices },
 { name: "Times present", stat: stats.timesPresent },
 { name: "Times online", stat: stats.timesOnline },
 { name: "Times absent", stat: stats.timesAbsent },
 { name: "Attendance rate", stat: stats.attendanceRate },
 ].map((item) => (
 <Stat key={item.name} eyebrow={item.name} value={item.stat} />
 ))}
 </div>

 {/* Attendance Timeline Chart */}
 {chartData.length > 0 ? (
 <div className="mb-8 bg-white rounded-lg border shadow p-6">
 <h2 className="text-lg font-semibold text-ink-900 mb-4">
 Attendance Timeline
 </h2>
 <ResponsiveContainer width="100%" height={300}>
 <LineChart data={chartData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="date" tick={{ fontSize: 11 }} />
 <YAxis
 domain={[0.5, 3.5]}
 ticks={[1, 2, 3]}
 tickFormatter={(v) => STATUS_LABELS[v] || ""}
 />
 <Tooltip
 formatter={(value) => [STATUS_LABELS[value] || value, "Status"]}
 />
 <Line
 type="monotone"
 dataKey="Status"
 stroke="#2563eb"
 strokeWidth={2}
 dot={({ cx, cy, payload }) => {
 const color = payload.Status === 3 ? "#22c55e" : payload.Status === 2 ? "#3b82f6" : "#ef4444";
 return <circle cx={cx} cy={cy} r={5} fill={color} stroke={color} />;
 }}
 activeDot={{ r: 7 }}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 ) : (
 <div className="mb-8 bg-white rounded-lg border shadow p-6 text-center text-ink-500">
 No attendance records found for {new Date().getFullYear()}.
 </div>
 )}

 {/* Detailed Attendance Log */}
 <div className="bg-white rounded-lg border shadow p-6">
 <h2 className="text-lg font-semibold text-ink-900 mb-4">
 Attendance Log
 </h2>
 {reversedRecords.length > 0 ? (
 <>
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-ink-300">
 <thead>
 <tr>
 <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-ink-900 sm:pl-0">
 S/N
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Date
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Status
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-ink-200">
 {paginatedRecords.map((record, index) => (
 <tr key={index}>
 <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-ink-900 sm:pl-0">
 {(currentPage - 1) * PAGE_SIZE + index + 1}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
 {sundayToDisplayDate(record.date)}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm">
 <span
 className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
 record.status === "Present" ||
 record.status === "Online"
 ? "bg-forest/10 text-forest"
 : record.status === "Absent"
 ? "bg-brick/10 text-brick"
 : "bg-mustard/10 text-mustard"
 }`}
 >
 {record.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between border-t border-ink-200 pt-4 mt-4">
 <p className="text-sm text-ink-500">
 Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, reversedRecords.length)} of {reversedRecords.length}
 </p>
 <div className="flex space-x-2">
 <button
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 disabled={currentPage === 1}
 className="px-3 py-1 text-sm rounded border border-ink-300 text-ink-700 hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Previous
 </button>
 <span className="px-3 py-1 text-sm text-ink-700">
 Page {currentPage} of {totalPages}
 </span>
 <button
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 disabled={currentPage === totalPages}
 className="px-3 py-1 text-sm rounded border border-ink-300 text-ink-700 hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </>
 ) : (
 <p className="text-ink-500">
 No attendance records found for {new Date().getFullYear()}.
 </p>
 )}
 </div>
 </>
 )}
 </Layout>
 </div>
 );
}
