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
  Legend,
} from "recharts";
import Header from "../components/Header";
import Layout from "../components/Layout";
import LoadingState from "../components/LoadingState";
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
      const results = await Promise.all(
        sundays.map((sunday) =>
          fetchWorkers(department, sunday, permissions).catch(() => null)
        )
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
  const STATUS_MAP = { Present: 3, Online: 2, Absent: 1 };
  const STATUS_LABELS = { 3: "Present", 2: "Online", 1: "Absent" };
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
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        {/* Breadcrumb & Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/attendance/summary" className="hover:underline">
              Summary
            </Link>
            <span>/</span>
            {workerDept && (
              <>
                <Link
                  to={`/department/${getDepartmentRoute(workerDept) || encodeURIComponent(workerDept)}`}
                  className="hover:underline"
                >
                  {workerDept}
                </Link>
                <span>/</span>
              </>
            )}
            <span>Attendance History</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workerName || "Worker Attendance"}
          </h1>
          {workerDept && (
            <p className="text-sm text-gray-500 mt-1">
              {workerDept}{workerTeam ? ` — ${workerTeam}` : ""} · {new Date().getFullYear()} Year-to-date
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="mt-12">
            <LoadingState />
          </div>
        ) : (
          <>
            {/* Stats Summary Cards */}
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-5 mb-8">
              {[
                { name: "Total Services", stat: stats.totalServices },
                { name: "Times Present", stat: stats.timesPresent },
                { name: "Times Online", stat: stats.timesOnline },
                { name: "Times Absent", stat: stats.timesAbsent },
                { name: "Attendance Rate", stat: stats.attendanceRate },
              ].map((item) => (
                <div
                  key={item.name}
                  className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6"
                >
                  <dt className="truncate text-sm font-medium text-gray-500">
                    {item.name}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                    {item.stat}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Attendance Timeline Chart */}
            {chartData.length > 0 ? (
              <div className="mb-8 bg-white rounded-lg border shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
              <div className="mb-8 bg-white rounded-lg border shadow p-6 text-center text-gray-500">
                No attendance records found for {new Date().getFullYear()}.
              </div>
            )}

            {/* Detailed Attendance Log */}
            <div className="bg-white rounded-lg border shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Attendance Log
              </h2>
              {reversedRecords.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                            S/N
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Date
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRecords.map((record, index) => (
                          <tr key={index}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                              {(currentPage - 1) * PAGE_SIZE + index + 1}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {sundayToDisplayDate(record.date)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                  record.status === "Present" ||
                                  record.status === "Online"
                                    ? "bg-green-100 text-green-800"
                                    : record.status === "Absent"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
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
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
                      <p className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, reversedRecords.length)} of {reversedRecords.length}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">
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
