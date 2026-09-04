import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "../components/Header";
import Layout from "../components/Layout";
import DateRangeFilter from "../components/DateRangeFilter";
import LoadingState from "../components/LoadingState";
import { fetchAuditLogs } from "../services/audit";
import { getUserRole } from "../utils/getUserRole";
import { format, startOfDay, endOfDay } from "date-fns";

const FRIENDLY_MAP = {
  "/api/hub/rbac/me": "Permissions Loaded",
};

export default function AuditLog() {
  const { isSuperAdmin, isChurchAdmin } = getUserRole();
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      startDate: startOfDay(now),
      endDate: endOfDay(now),
    };
  });
  const [dynamicEvents, setDynamicEvents] = useState([]);
  const limit = 20;

  useEffect(() => {
    fetchAuditLogs(1, 1000, {})
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        const unique = [...new Set(list.map((log) => log.event).filter(Boolean))].sort();
        setDynamicEvents(unique);
      })
      .catch(() => {});
  }, []);

  const eventOptions = useMemo(() => {
    const base = [
      { value: "", label: "All Events" },
      { value: "login", label: "Login" },
      { value: "workers_fetched", label: "Workers Fetched" },
      { value: "workers_listed_admin", label: "Workers Listed (Admin)" },
      { value: "admin_attendance_fetched", label: "Admin Attendance Fetched" },
      { value: "attendance_closed", label: "Attendance Closed" },
    ];
    
    dynamicEvents.forEach((evt) => {
      if (!base.some((b) => b.value === evt)) {
        const label = FRIENDLY_MAP[evt] || evt
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        base.push({ value: evt, label });
      }
    });
    
    return base;
  }, [dynamicEvents]);

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
    ...(startDateStr && { fromDate: startDateStr }),
    ...(endDateStr && { toDate: endDateStr }),
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
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>
 <div className="qc-card p-12 text-center">
 <div className="qc-eyebrow text-ink-400">Access denied</div>
 <p className="mt-2 text-ink-700 text-base">
 You do not have permission to view audit logs.
 </p>
 </div>
 </Layout>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-cream">
 <Header />
 <Layout>

 <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
 <div>
 <div className="qc-eyebrow">System</div>
 <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
 Audit log
 </h1>
 <p className="mt-1 text-sm text-ink-500">
 Every action and change, traced.
 </p>
 </div>
 <div className="qc-num text-2xs uppercase tracking-tag text-ink-500">
 <span className="qc-num text-base text-ink-900 font-medium mr-1.5">
 {Number(pagination.total ?? 0).toLocaleString()}
 </span>
 entries
 </div>
 </div>

 {/* Filters */}
 <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-3">
 <div className="flex-1 min-w-0">
 <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
 </div>
 <div className="sm:w-56">
 <div className="qc-label">Event</div>
 <select
 value={eventFilter}
 onChange={(e) => {
 setEventFilter(e.target.value);
 setPage(1);
 }}
 className="qc-input"
 >
  {eventOptions.map((opt) => (
  <option key={opt.value} value={opt.value}>
  {opt.label}
  </option>
  ))}
 </select>
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
 <table className="min-w-full divide-y divide-ink-300">
 <thead className="bg-cream">
 <tr>
 <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-ink-900 sm:pl-6">
 Timestamp
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 User
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Event
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Path
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Method
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 Department
 </th>
 <th className="px-3 py-3.5 text-left text-sm font-semibold text-ink-900">
 IP / Device
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-ink-200">
 {logs.length > 0 ? (
 logs.map((log, index) => {
 const meta = log.metadata || {};
 return (
 <tr key={log.id ?? index} className="hover:bg-cream">
 <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-ink-500 sm:pl-6">
 {log.createdat
 ? format(
 new Date(log.createdat),
 "MMM d, yyyy HH:mm:ss"
 )
 : "-"}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-900">
 {(log.user_code || log.user_id) || "-"}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm">
 <span className="inline-flex rounded-full px-2 text-xs font-medium leading-5 bg-cream-200 text-ink-800">
 {FRIENDLY_MAP[log.event] || (log.event ?? "-")}
 </span>
 </td>
 <td className="px-3 py-4 text-sm text-ink-500 font-mono max-w-[12rem] truncate" title={meta.path}>
 {meta.path ?? "-"}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
 {meta.method ?? "-"}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
 {meta.department ?? "-"}
 </td>
 <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-500">
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
 className="py-8 text-center text-sm text-ink-500"
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
 const btnDefault = "border-ink-300 bg-white text-ink-700 hover:bg-cream";
 const btnActive = "border-black bg-black text-white";
 return (
 <div className="flex items-center justify-between border-t border-ink-200 bg-white px-4 py-3 sm:px-6">
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
 <p className="text-sm text-ink-700">
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
