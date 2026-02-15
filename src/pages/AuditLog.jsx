import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "../components/Header";
import Layout from "../components/Layout";
import DateRangeFilter from "../components/DateRangeFilter";
import LoadingState from "../components/LoadingState";
import { fetchAuditLogs } from "../services/overview";
import { getUserRole } from "../utils/getUserRole";
import { format } from "date-fns";

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "LOGIN", label: "Login" },
  { value: "APPROVE", label: "Approve" },
  { value: "REJECT", label: "Reject" },
  { value: "ATTENDANCE", label: "Attendance" },
];

export default function AuditLog() {
  const { isSuperAdmin, isChurchAdmin } = getUserRole();
  const [page, setPage] = useState(1);
  const [actionTypeFilter, setActionTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const limit = 20;

  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setDateRange({ startDate, endDate });
    setPage(1); // Reset to first page on date change
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
    ...(actionTypeFilter && { actionType: actionTypeFilter }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["auditLogs", page, limit, filters],
    queryFn: () => fetchAuditLogs(page, limit, filters),
    enabled: isSuperAdmin || isChurchAdmin,
  });

  const logs = data?.data || data || [];
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
              value={actionTypeFilter}
              onChange={(e) => {
                setActionTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:ring-1 focus:ring-black"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {pagination.total || 0} total entries
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
                      Action
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Target
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.length > 0 ? (
                    logs.map((log, index) => (
                      <tr key={log.id || index} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                          {log.timestamp
                            ? format(
                                new Date(log.timestamp),
                                "MMM d, yyyy HH:mm"
                              )
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {log.userName || log.userId || "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              log.action === "CREATE"
                                ? "bg-green-100 text-green-800"
                                : log.action === "DELETE"
                                ? "bg-red-100 text-red-800"
                                : log.action === "UPDATE"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {log.action || "-"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {log.target || "-"}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {log.details || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
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
            {(pagination.hasNext || pagination.hasPrev) && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.hasNext}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{page}</span> of{" "}
                      <span className="font-medium">
                        {pagination.totalPages || 1}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasNext}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Layout>
    </div>
  );
}
