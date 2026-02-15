import { useState, useCallback } from "react";
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
import DateRangeFilter from "../components/DateRangeFilter";
import LoadingState from "../components/LoadingState";
import { fetchWorkerAttendanceHistory } from "../services/workers";
import { format } from "date-fns";
import { getDepartmentRoute } from "../utils/routeObject";

export default function WorkerAttendanceHistory() {
  const { workerId } = useParams();

  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setDateRange({ startDate, endDate });
  }, []);

  const startDateStr = dateRange.startDate
    ? format(dateRange.startDate, "yyyy-MM-dd")
    : null;
  const endDateStr = dateRange.endDate
    ? format(dateRange.endDate, "yyyy-MM-dd")
    : null;

  // Fetch worker attendance history
  const { data, isLoading } = useQuery({
    queryKey: ["workerAttendanceHistory", workerId, startDateStr, endDateStr],
    queryFn: () =>
      fetchWorkerAttendanceHistory(workerId, startDateStr, endDateStr),
    enabled: !!workerId && !!startDateStr && !!endDateStr,
  });

  const history = data || {};
  const records = history.history ?? history.records ?? [];
  const worker = history.worker || {};

  // Resolve worker display name from various possible API field names
  const workerName =
    worker.firstname || worker.first_name
      ? `${worker.firstname || worker.first_name} ${worker.lastname || worker.last_name || ""}`.trim()
      : worker.fullname || worker.name || null;

  // Handle both spec { summary } and legacy { stats } shapes
  const summaryData = history.summary ?? history.stats ?? {};
  const stats = {
    totalServices: summaryData.totalDays ?? summaryData.totalServices ?? 0,
    timesPresent: summaryData.present ?? summaryData.timesPresent ?? 0,
    timesAbsent: summaryData.absent ?? summaryData.timesAbsent ?? 0,
    attendanceRate: summaryData.attendanceRate ?? summaryData.attendanceRate ?? "0%",
  };

  // Prepare chart data from records
  const chartData = records.map((record) => ({
    date: record.date || "",
    present: record.status === "Present" || record.status === "Online" ? 1 : 0,
    absent: record.status === "Absent" ? 1 : 0,
    other:
      record.status !== "Present" &&
      record.status !== "Online" &&
      record.status !== "Absent"
        ? 1
        : 0,
  }));

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
            {worker.department && (
              <>
                <Link
                  to={`/department/${getDepartmentRoute(worker.department) || encodeURIComponent(worker.department)}`}
                  className="hover:underline"
                >
                  {worker.department}
                </Link>
                <span>/</span>
              </>
            )}
            <span>Attendance History</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workerName || "Name of Worker"}
          </h1>
          {worker.department && (
            <p className="text-sm text-gray-500 mt-1">
              {worker.department} - {worker.team || ""}
            </p>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="mb-8">
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
        </div>

        {isLoading ? (
          <div className="mt-12">
            <LoadingState />
          </div>
        ) : (
          <>
            {/* Stats Summary Cards */}
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
              {[
                { name: "Total Services", stat: stats.totalServices },
                { name: "Times Present", stat: stats.timesPresent },
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
            {chartData.length > 0 && (
              <div className="mb-8 bg-white rounded-lg border shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Attendance Timeline
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#22c55e" name="Present" />
                    <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                    <Bar dataKey="other" fill="#eab308" name="Other" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Detailed Attendance Log */}
            <div className="bg-white rounded-lg border shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Attendance Log
              </h2>
              {records.length > 0 ? (
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
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Marked By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {records.map((record, index) => (
                        <tr key={record.id || index}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {index + 1}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {record.date}
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
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {record.markedBy || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">
                  No attendance records found for the selected date range.
                </p>
              )}
            </div>
          </>
        )}
      </Layout>
    </div>
  );
}
