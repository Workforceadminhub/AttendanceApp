import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "../components/Header";
import Layout from "../components/Layout";
import DateRangeFilter from "../components/DateRangeFilter";
import LoadingState from "../components/LoadingState";
import { fetchAuditLogs } from "../services/overview";
import { getUserRole } from "../utils/getUserRole";
import { format } from "date-fns";

const EVENT_FILTERS = [
  { value: "", label: "All Events" },
  { value: "login", label: "Login" },
  { value: "workers_fetched", label: "Workers Fetched" },
  { value: "workers_listed_admin", label: "Workers Listed (Admin)" },
  { value: "admin_attendance_fetched", label: "Admin Attendance Fetched" },
  { value: "attendance_closed", label: "Attendance Closed" },
];

export default function AuditLog() {
  const { isSuperAdmin, isChurchAdmin } = getUserRole();
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const limit = 20;

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setDateRange({ startDate, endDate });
    setPage(1);
  }, []);

  const startDateStr = dateRange.startDate
    ? format(dateRange.startDate, "yyyy-MM-dd")
    : null;
  const endDateStr = dateRange.endDate
    ? format(dateRange.endDate, "yyyy-MM-dd")
    : null;

  const filters = {
    ...(startDateStr && { startDate: startDateStr }),
    ...(endDateStr && { endDate: endDateStr }),
    ...(eventFilter && { event: eventFilter }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["auditLogs", page, limit, filters],
    queryFn: () => fetchAuditLogs(page, limit, filters),
    enabled: isSuperAdmin || isChurchAdmin,
  });

  const logs = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination || {
    page: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  };

  // Access check
  if (!isSuperAdmin && !isChurchAdmin) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <Header />
        <Layout>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-lg">
              You do not have permission to view audit logs.
            </p>
          </div>
        </Layout>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <Header />
      <Layout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track all actions and changes across the system.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
          <div className="flex items-center gap-4">
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:ring-1 focus:ring-black"
            >
              {EVENT_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {pagination.total ?? 0} total entries
            </span>
          </div>
        </div>

        {/* Audit Log Table */}
        {isLoading ? (
          <div className="mt-12">
            <LoadingState />
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Timestamp
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      User
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Event
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Path
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Method
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Department
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      IP / Device
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.length > 0 ? (
                    logs.map((log, index) => {
                      const meta = log.metadata || {};
                      return (
                        <tr key={log.id ?? index} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                            {log.createdat
                              ? format(
                                  new Date(log.createdat),
                                  "MMM d, yyyy HH:mm:ss"
                                )
                              : "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {(log.user_code || log.user_id) || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className="inline-flex rounded-full px-2 text-xs font-medium leading-5 bg-gray-100 text-gray-800">
                              {log.event ?? "-"}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 font-mono max-w-[12rem] truncate" title={meta.path}>
                            {meta.path ?? "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {meta.method ?? "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {meta.department ?? "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {meta.ip ?? "-"}
                            {meta.deviceType ? ` · ${meta.deviceType}` : ""}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-sm text-gray-500"
                      >
                        No audit log entries found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (pagination.hasNext || pagination.hasPrev) && (() => {
              const totalPages = pagination.totalPages || 1;
              const maxVisible = 5;
              let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
              let endPage = Math.min(totalPages, startPage + maxVisible - 1);
              if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1);
              }
              const pageNumbers = [];
              for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
              const btn = "relative inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50";
              const btnDefault = "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
              const btnActive = "border-black bg-black text-white";
              return (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrev}
                      className={`${btn} ${btnDefault}`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasNext}
                      className={`${btn} ${btnDefault}`}
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{page}</span> of{" "}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!pagination.hasPrev}
                        className={`${btn} ${btnDefault}`}
                      >
                        Previous
                      </button>
                      {pageNumbers.map((n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`${btn} ${n === page ? btnActive : btnDefault}`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!pagination.hasNext}
                        className={`${btn} ${btnDefault}`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Layout>
    </div>
  );
}
