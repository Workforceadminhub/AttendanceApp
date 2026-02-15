import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
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
import DateRangeFilter from "../components/DateRangeFilter";
import AttendanceLeaderboard from "../components/AttendanceLeaderboard";
import LoadingState from "../components/LoadingState";
import { routeObject, getDepartmentRoute, getDepartmentNameFromRoute } from "../utils/routeObject";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import {
  fetchDepartmentAttendance,
  fetchAttendanceByDateRange,
  fetchAttendanceTrends,
} from "../services/attendance";
import { fetchWorkers } from "../services/workers";
import apiRequest from "../utils/apiClient";
import { format } from "date-fns";

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

  // Phase 7: Try spec endpoint first when we have departmentRoute
  const {
    data: specData,
    isLoading: isSpecLoading,
  } = useQuery({
    queryKey: ["departmentDetailSpec", departmentRoute, startDateStr, endDateStr],
    queryFn: () =>
      departmentRoute
        ? fetchDepartmentAttendance(departmentRoute, startDateStr, endDateStr)
        : null,
    enabled: !!departmentRoute && !!startDateStr && !!endDateStr,
  });

  // Legacy: Fetch attendance and trends when spec API unavailable
  const {
    data: attendanceData,
    isLoading: isAttendanceLoading,
  } = useQuery({
    queryKey: ["departmentAttendance", decodedDepartment, startDateStr, endDateStr],
    queryFn: () =>
      fetchAttendanceByDateRange(decodedDepartment, startDateStr, endDateStr),
    enabled: (!specData || !specData.summary) && !!startDateStr && !!endDateStr,
  });

  const {
    data: trendsData,
    isLoading: isTrendsLoading,
  } = useQuery({
    queryKey: ["departmentTrends", decodedDepartment, startDateStr, endDateStr],
    queryFn: () =>
      fetchAttendanceTrends(decodedDepartment, startDateStr, endDateStr),
    enabled: (!specData || !specData.summary) && !!startDateStr && !!endDateStr,
  });

  const {
    data: workersData,
    isLoading: isWorkersLoading,
  } = useQuery({
    queryKey: ["departmentWorkers", decodedDepartment],
    queryFn: () => fetchWorkers(decodedDepartment),
    enabled: !specData?.workers,
  });

  // Use spec data when available, else legacy
  const workers = specData?.workers
    ? specData.workers.map((w) => ({
        id: w.workerId ?? w.id,
        firstname: w.firstname ?? w.fullname?.split(" ")[0],
        lastname: w.lastname ?? w.fullname?.split(" ").slice(1).join(" "),
        ...w,
      }))
    : workersData || [];
  const trends = trendsData || [];
  const queryClient = useQueryClient();

  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const { isSuperAdmin, isChurchAdmin, isHOD, isTeamAdmin, isSubTeamAdmin } = getUserRole();
  const canEditWorkers =
    (isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin || isSubTeamAdmin) &&
    canAccessDepartment(decodedDepartment);

  // Calculate summary stats: use spec summary when available, else from attendance data
  const summary = specData?.summary
    ? {
        total: specData.summary.totalWorkers ?? specData.summary.total ?? 0,
        present: specData.summary.present ?? 0,
        absent: specData.summary.absent ?? 0,
      }
    : attendanceData
    ? {
        total: attendanceData.reduce?.((sum, r) => sum + (r.total || 0), 0) || 0,
        present: attendanceData.reduce?.((sum, r) => sum + (r.present || 0), 0) || 0,
        absent: attendanceData.reduce?.((sum, r) => sum + (r.absent || 0), 0) || 0,
      }
    : { total: 0, present: 0, absent: 0 };

  const percentage =
    specData?.summary?.presentPercentage ??
    (summary.total > 0
      ? ((summary.present / summary.total) * 100).toFixed(2) + "%"
      : "0%");

  const toggleWorker = (id) => {
    setSelectedWorkers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableWorkers = workers.filter((w) => w.id != null);
  const toggleAllWorkers = () => {
    if (selectedWorkers.size === selectableWorkers.length) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(new Set(selectableWorkers.map((w) => w.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedWorkers.size === 0) return;
    const confirmMsg = `You are about to permanently delete ${selectedWorkers.size} worker(s).\n\nType "DELETE ALL" to confirm (case-sensitive):`;
    const userInput = window.prompt(confirmMsg);
    if (userInput !== "DELETE ALL") {
      if (userInput !== null) {
        toast.error("Bulk deletion cancelled. You must type 'DELETE ALL' exactly to confirm.");
      }
      return;
    }

    setIsDeleting(true);
    const ids = Array.from(selectedWorkers);
    let successCount = 0;
    let errorCount = 0;

    for (const workerId of ids) {
      try {
        await apiRequest("DELETE", `/api/super/admin/${workerId}/workers`);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsDeleting(false);
    setSelectedWorkers(new Set());
    queryClient.invalidateQueries({ queryKey: ["departmentWorkers", decodedDepartment] });

    if (successCount > 0) {
      toast.success(`${successCount} worker(s) deleted successfully`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to delete ${errorCount} worker(s)`);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        {/* Department Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/attendance/summary" className="hover:underline">
              Summary
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-900">{decodedDepartment}</span>
          </div>
          <p className="text-sm text-gray-500">Team: {team}</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-8">
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
        </div>

        {/* Summary Cards */}
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
          {[
            { name: "Total Strength", stat: summary.total },
            { name: "Present", stat: summary.present },
            { name: "Absent", stat: summary.absent },
            { name: "Attendance %", stat: percentage },
          ].map((item) => (
            <div
              key={item.name}
              className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6"
            >
              <dt className="truncate text-sm font-medium text-gray-500">
                {item.name}
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {(isSpecLoading || isAttendanceLoading) ? "..." : item.stat}
              </dd>
            </div>
          ))}
        </dl>

        {/* Attendance Trend Chart */}
        <div className="mb-8 bg-white rounded-lg border shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Attendance Trend
          </h2>
          {isTrendsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingState />
            </div>
          ) : trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="present"
                  stroke="#22c55e"
                  name="Present"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="absent"
                  stroke="#ef4444"
                  name="Absent"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#6b7280"
                  name="Total"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No trend data available for the selected date range.
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="mb-8">
          <AttendanceLeaderboard
            department={decodedDepartment}
            startDate={startDateStr}
            endDate={endDateStr}
          />
        </div>

        {/* Workers List */}
        <div className="bg-white rounded-lg border shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Workers ({workers.length})
            </h2>
            {canEditWorkers && (
              <span className="flex items-center gap-3">
                {selectedWorkers.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : `Delete ${selectedWorkers.size} Selected`}
                  </button>
                )}
                <Link
                  to={`/department/${departmentRoute || encodeURIComponent(decodedDepartment)}/bulk-add`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Bulk Add Workers
                </Link>
              </span>
            )}
          </div>
          {isWorkersLoading ? (
            <LoadingState />
          ) : workers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    {canEditWorkers && (
                      <th className="py-3.5 pl-4 pr-3 text-left sm:pl-0">
                        <input
                          type="checkbox"
                          checked={selectableWorkers.length > 0 && selectedWorkers.size === selectableWorkers.length}
                          onChange={toggleAllWorkers}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      S/N
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Phone
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workers.map((worker, index) => (
                    <tr key={worker.id || index}>
                      {canEditWorkers && (
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-0">
                          <input
                            type="checkbox"
                          checked={worker.id != null && selectedWorkers.has(worker.id)}
                          onChange={() => worker.id != null && toggleWorker(worker.id)}
                          disabled={worker.id == null}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {worker.firstname} {worker.lastname}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {worker.phone || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            worker.status === "ACTIVE" || !worker.status
                              ? "bg-green-100 text-green-800"
                              : worker.status === "INACTIVE"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {worker.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className="flex items-center gap-3">
                          <Link
                            to={`/worker/${worker.id}/attendance`}
                            className="text-blue-600 hover:underline"
                          >
                            View History
                          </Link>
                          {canEditWorkers && (
                            <Link
                              to={`/worker/${worker.id}?from=department:${encodeURIComponent(decodedDepartment)}`}
                              className="text-green-600 hover:underline"
                            >
                              Edit
                            </Link>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No workers found in this department.</p>
          )}
        </div>
      </Layout>
    </div>
  );
}
