import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { format } from "date-fns";
import Layout from "../components/Layout";
import GenericModal from "../components/GenericModal";
import { getUser } from "../utils/getUser";
import { getUserRole } from "../utils/getUserRole";
import { fetchWorkersBallRegistrations } from "../services/workersBall";
import { exportWorkersBallWorkbook } from "../utils/exportWorkersBall";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CameraIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  UserCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const PAGE_SIZE = 25;

function formatDateSafe(raw, pattern = "dd MMM yyyy, h:mm a") {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "-" : format(d, pattern);
  } catch {
    return "-";
  }
}

export default function WorkersBallAdmin() {
  const navigate = useNavigate();

  // Role verification - Super Admin & Church Admin
  const authUser = getUser();
  const { isSuperAdmin, isChurchAdmin } = getUserRole(authUser);
  const hasAccess = Boolean(
    isSuperAdmin ||
      isChurchAdmin ||
      authUser?.permissionLevel === "SUPER_ADMIN" ||
      authUser?.permissionLevel === "CHURCH_ADMIN" ||
      authUser?.department === "Super Admin"
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Raw data from server
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [serverMetrics, setServerMetrics] = useState({
    total: 0,
    totalRegistered: 0,
    totalAttended: 0,
  });

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'attended' | 'not_attended'
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Selected worker for detail pass modal
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleDepartmentChange = (val) => {
    setDepartmentFilter(val);
    setCurrentPage(1);
  };

  const handleTeamChange = (val) => {
    setTeamFilter(val);
    setCurrentPage(1);
  };

  // Load registrations from API
  const loadData = useCallback(async (isSilent = false) => {
    if (!hasAccess) return;
    if (isSilent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await fetchWorkersBallRegistrations();
      setError(null);
      const list = result.registrations || [];
      setAllRegistrations(list);
      setServerMetrics({
        total: result.total || list.length,
        totalRegistered: result.totalRegistered || list.length,
        totalAttended:
          result.totalAttended ?? list.filter((r) => r.attended).length,
      });
    } catch (err) {
      const msg = err?.message || "Failed to load Workers Ball registrations.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) {
      toast.error("Super admin access required.");
      navigate("/attendance/dashboard");
      return;
    }
    let cancelled = false;
    const fetchInitialData = async () => {
      try {
        const result = await fetchWorkersBallRegistrations();
        if (cancelled) return;
        setError(null);
        const list = result.registrations || [];
        setAllRegistrations(list);
        setServerMetrics({
          total: result.total || list.length,
          totalRegistered: result.totalRegistered || list.length,
          totalAttended:
            result.totalAttended ?? list.filter((r) => r.attended).length,
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || "Failed to load Workers Ball registrations.";
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    void fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, navigate]);

  // Extract unique departments and teams for filter dropdowns
  const { departmentOptions, teamOptions } = useMemo(() => {
    const depts = new Set();
    const teams = new Set();
    allRegistrations.forEach((r) => {
      if (r.department && r.department !== "Unassigned") depts.add(r.department);
      if (r.team && r.team !== "Unassigned") teams.add(r.team);
    });
    return {
      departmentOptions: ["All", ...Array.from(depts).sort()],
      teamOptions: ["All", ...Array.from(teams).sort()],
    };
  }, [allRegistrations]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allRegistrations.filter((r) => {
      // Status filter
      if (statusFilter === "attended" && !r.attended) return false;
      if (statusFilter === "not_attended" && r.attended) return false;

      // Department filter
      if (departmentFilter !== "All" && r.department !== departmentFilter) {
        return false;
      }

      // Team filter
      if (teamFilter !== "All" && r.team !== teamFilter) {
        return false;
      }

      // Search term (name, code, email, phone, role)
      if (term) {
        const matchesName = String(r.name || "").toLowerCase().includes(term);
        const matchesCode = String(r.code || r.accessCode || "")
          .toLowerCase()
          .includes(term);
        const matchesEmail = String(r.email || "").toLowerCase().includes(term);
        const matchesPhone = String(r.phone || "").toLowerCase().includes(term);
        const matchesRole = String(r.role || "").toLowerCase().includes(term);
        const matchesDept = String(r.department || "").toLowerCase().includes(term);
        const matchesTeam = String(r.team || "").toLowerCase().includes(term);

        if (
          !matchesName &&
          !matchesCode &&
          !matchesEmail &&
          !matchesPhone &&
          !matchesRole &&
          !matchesDept &&
          !matchesTeam
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allRegistrations, search, statusFilter, departmentFilter, teamFilter]);

  // Derived counts
  const totalRegisteredCount =
    serverMetrics.totalRegistered || allRegistrations.length;
  const totalAttendedCount = allRegistrations.filter((r) => r.attended).length;
  const totalNotAttendedCount = Math.max(
    0,
    totalRegisteredCount - totalAttendedCount
  );
  const checkinRate =
    totalRegisteredCount > 0
      ? Math.round((totalAttendedCount / totalRegisteredCount) * 100)
      : 0;

  // Pagination slice
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRegistrations.length / PAGE_SIZE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedRows = filteredRegistrations.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  // Handle Excel Export
  const handleExport = async () => {
    setExporting(true);
    try {
      const count = await exportWorkersBallWorkbook({
        registrations: filteredRegistrations,
      });
      toast.success(
        `Exported ${count} record${count !== 1 ? "s" : ""} to Excel.`
      );
    } catch (err) {
      toast.error(err?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  // Copy code helper
  const handleCopyCode = async (code, e) => {
    if (e) e.stopPropagation();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Copied ${code} to clipboard`);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      toast.info(`Access Code: ${code}`);
    }
  };

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== "all" ||
    departmentFilter !== "All" ||
    teamFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDepartmentFilter("All");
    setTeamFilter("All");
  };

  if (!hasAccess) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="rounded-2xl border border-brick/30 bg-brick/5 p-8 text-center">
            <h2 className="text-xl font-bold text-brick mb-2">Access Denied</h2>
            <p className="text-sm text-ink-600 mb-6">
              Super Admin authorization is required to track Workers Ball
              registrations and attendance.
            </p>
            <Link
              to="/attendance/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-cream"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Link
              to="/attendance/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-ink-500 hover:text-ink transition"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-mono font-medium tracking-wide bg-amber-500/10 text-amber-700 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                GALA ACCREDITATION
              </span>
              <span className="text-2xs font-mono text-ink-400 uppercase tracking-widest">
                SUPER ADMIN
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Workers Ball 2026 Tracking
            </h1>
            <p className="text-sm text-ink-600">
              Live registration registry, check-in audit, and attendee
              accreditation desk.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink transition hover:bg-ink-50 disabled:opacity-50"
              title="Refresh data"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${refreshing ? "animate-spin text-amber-600" : "text-ink-600"}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loading || filteredRegistrations.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink transition hover:bg-ink-50 hover:border-ink-300 disabled:opacity-50 shadow-xs"
            >
              <ArrowDownTrayIcon className="h-4 w-4 text-forest" />
              <span>{exporting ? "Generating Excel..." : "Export Excel"}</span>
            </button>

            <Link
              to="/scan/wb26"
              state={{ from: "/admin/workers-ball-registrations" }}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-cream shadow-sm hover:bg-ink-900 transition focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            >
              <CameraIcon className="h-4 w-4 text-amber-400" />
              <span>Open Scanner Desk</span>
            </Link>
          </div>
        </div>

        {/* Metrics KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Registered */}
          <div className="relative overflow-hidden rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-500">
                Total Registered
              </span>
              <span className="p-2 rounded-lg bg-ink-100 text-ink-700">
                <UserGroupIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-ink tracking-tight">
                {loading ? "..." : totalRegisteredCount.toLocaleString()}
              </span>
              <span className="text-xs text-ink-500 font-medium">workers</span>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              Passes issued with HGWB codes
            </p>
          </div>

          {/* Marked Attended */}
          <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
                Marked Attended
              </span>
              <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircleIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-950 tracking-tight">
                {loading ? "..." : totalAttendedCount.toLocaleString()}
              </span>
              <span className="text-xs text-emerald-700 font-medium">checked-in</span>
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              Scanned & accredited at gala door
            </p>
          </div>

          {/* Awaiting Arrival */}
          <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-800 font-semibold">
                Awaiting Arrival
              </span>
              <span className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <ClockIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-950 tracking-tight">
                {loading ? "..." : totalNotAttendedCount.toLocaleString()}
              </span>
              <span className="text-xs text-amber-700 font-medium">pending</span>
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Registered, yet to be scanned
            </p>
          </div>

          {/* Attendance Turnout Rate */}
          <div className="relative overflow-hidden rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-500">
                Check-in Turnout
              </span>
              <span className="text-xs font-bold font-mono text-ink-700">
                {checkinRate}%
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-ink tracking-tight">
                {loading ? "..." : `${checkinRate}%`}
              </span>
              <span className="text-xs text-ink-500 font-medium">turnout</span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 w-full rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, checkinRate))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status Tab Navigation & Search Toolbar */}
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-xs space-y-4">
          {/* Top Row: Status Tabs & Result Count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-ink-100 pb-3">
            <div className="inline-flex rounded-lg bg-ink-100/80 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleStatusChange("all")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "all"
                    ? "bg-white text-ink shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>All Registrations</span>
                <span className="rounded-full bg-ink-100 px-1.5 py-0.2 text-2xs text-ink-700">
                  {totalRegisteredCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("attended")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "attended"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <CheckCircleIcon className="h-3.5 w-3.5" />
                <span>Attended</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "attended"
                      ? "bg-emerald-700 text-emerald-100"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {totalAttendedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("not_attended")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "not_attended"
                    ? "bg-amber-600 text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <ClockIcon className="h-3.5 w-3.5" />
                <span>Not Attended</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "not_attended"
                      ? "bg-amber-700 text-amber-100"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {totalNotAttendedCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-ink-500">
              <span>
                Showing{" "}
                <strong className="text-ink">
                  {filteredRegistrations.length}
                </strong>{" "}
                of {totalRegisteredCount} workers
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-brick hover:underline ml-2"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Multi-Field Search & Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search worker name, HGWB code, email, phone..."
                className="w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-400 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>

            {/* Department Dropdown */}
            <div>
              <select
                value={departmentFilter}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
              >
                <option value="All">All Departments</option>
                {departmentOptions
                  .filter((d) => d !== "All")
                  .map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>
            </div>

            {/* Team Dropdown */}
            <div>
              <select
                value={teamFilter}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
              >
                <option value="All">All Teams</option>
                {teamOptions
                  .filter((t) => t !== "All")
                  .map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-ink-200 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-amber-500 mb-3" />
              <p className="text-sm font-medium text-ink">
                Loading Workers Ball registrations...
              </p>
              <p className="text-xs text-ink-500 mt-1">
                Authenticating with Super Admin permissions
              </p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-brick mb-2">{error}</p>
              <button
                type="button"
                onClick={() => loadData()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-cream hover:bg-ink-900 transition"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Retry loading
              </button>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center">
              <UserCircleIcon className="mx-auto h-12 w-12 text-ink-300 mb-2" />
              <h3 className="text-base font-semibold text-ink">
                No registrations found
              </h3>
              <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Try loosening your search term or filter criteria to view more records."
                  : "No workforce registrations have been recorded for Workers Ball 2026 yet."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink hover:bg-ink-50"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/70 text-ink-700 font-mono text-2xs uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold w-12">#</th>
                    <th className="py-3 px-4 font-semibold">Worker Details</th>
                    <th className="py-3 px-4 font-semibold">Access Code</th>
                    <th className="py-3 px-4 font-semibold">Attendance Status</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">
                      Department / Team
                    </th>
                    <th className="py-3 px-4 font-semibold hidden lg:table-cell">
                      Contact
                    </th>
                    <th className="py-3 px-4 font-semibold hidden xl:table-cell">
                      Registered
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {paginatedRows.map((row, index) => {
                    const sn = startIndex + index + 1;
                    const isAttended = row.attended;

                    return (
                      <tr
                        key={row.id || row.code || index}
                        className="hover:bg-amber-50/30 transition cursor-pointer"
                        onClick={() => setSelectedWorker(row)}
                      >
                        {/* Serial Number */}
                        <td className="py-3.5 px-4 font-mono text-ink-400">
                          {sn}
                        </td>

                        {/* Worker Name & Role */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-ink text-sm">
                            {row.name}
                          </div>
                          <div className="text-2xs text-ink-500 font-medium">
                            {row.role || "Worker"}
                          </div>
                        </td>

                        {/* HGWB Access Code */}
                        <td className="py-3.5 px-4">
                          {row.code ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-ink-100 border border-ink-200 text-ink-900 tracking-wider">
                                {row.code}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyCode(row.code, e)}
                                title="Copy Access Code"
                                className="p-1 rounded text-ink-400 hover:text-ink hover:bg-ink-100 transition"
                              >
                                {copiedCode === row.code ? (
                                  <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-ink-400 font-mono text-2xs">-</span>
                          )}
                        </td>

                        {/* Attendance Status */}
                        <td className="py-3.5 px-4">
                          {isAttended ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 w-max">
                                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                                ATTENDED
                              </span>
                              {row.attendedAt && (
                                <span className="text-3xs text-ink-500 font-mono pl-1">
                                  {formatDateSafe(row.attendedAt, "h:mm a")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold font-mono bg-amber-50 text-amber-800 border border-amber-200">
                              <ClockIcon className="h-3.5 w-3.5 text-amber-600" />
                              NOT ATTENDED
                            </span>
                          )}
                        </td>

                        {/* Department / Team */}
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="text-ink font-medium">
                            {row.department || "Unassigned"}
                          </div>
                          <div className="text-2xs text-ink-500">
                            {row.team || "Unassigned"}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          <div className="text-ink font-mono text-2xs truncate max-w-xs">
                            {row.email || "-"}
                          </div>
                          <div className="text-2xs text-ink-500 font-mono">
                            {row.phone || "-"}
                          </div>
                        </td>

                        {/* Registered Date */}
                        <td className="py-3.5 px-4 hidden xl:table-cell text-ink-500 font-mono text-2xs">
                          {formatDateSafe(row.registeredAt, "dd MMM, h:mm a")}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorker(row);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-ink-700 bg-ink-50 hover:bg-ink-100 border border-ink-200 transition"
                          >
                            <QrCodeIcon className="h-3.5 w-3.5 text-amber-600" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {!loading && filteredRegistrations.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-ink-200 px-4 py-3 bg-white">
              <span className="text-xs text-ink-500 font-mono">
                Showing {startIndex + 1} to{" "}
                {Math.min(startIndex + PAGE_SIZE, filteredRegistrations.length)}{" "}
                of {filteredRegistrations.length} results
              </span>

              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className="px-3 text-xs font-mono text-ink-700">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage >= totalPages}
                  className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Worker Pass & Registration Detail Modal */}
        {selectedWorker && (
          <GenericModal
            isOpen={Boolean(selectedWorker)}
            onClose={() => setSelectedWorker(null)}
            title="Workers Ball Registration Record"
            size="medium"
          >
            <div className="space-y-5">
              {/* Luxury Pass Card Preview */}
              <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#1A1714] via-[#121110] to-[#0A0908] p-5 text-amber-50 shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-amber-400">
                      OFFICIAL GALA PASS • 2026
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                      {selectedWorker.name}
                    </h3>
                    <p className="text-xs text-amber-200/80">
                      {selectedWorker.role} • {selectedWorker.department}
                    </p>
                  </div>
                  {/* Status Indicator */}
                  {selectedWorker.attended ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
                      ACCREDITED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      <ClockIcon className="h-3.5 w-3.5 text-amber-400" />
                      REGISTERED
                    </span>
                  )}
                </div>

                {/* Pass Code Barcode Stub */}
                <div className="mt-4 pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-amber-300/70">
                      ACCREDITATION CODE
                    </span>
                    <div className="font-mono text-xl font-extrabold text-amber-300 tracking-wider">
                      {selectedWorker.code || "NO CODE ASSIGNED"}
                    </div>
                  </div>
                  {selectedWorker.code && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(selectedWorker.code)}
                      className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-mono transition"
                    >
                      {copiedCode === selectedWorker.code ? (
                        <>
                          <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Data Fields Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-ink-50/50 p-4 rounded-xl border border-ink-100">
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Department
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    {selectedWorker.department || "Unassigned"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Team
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    {selectedWorker.team || "Unassigned"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Email Address
                  </span>
                  <div className="font-mono text-ink mt-0.5 truncate">
                    {selectedWorker.email || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Phone Number
                  </span>
                  <div className="font-mono text-ink mt-0.5">
                    {selectedWorker.phone || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Registered On
                  </span>
                  <div className="font-mono text-ink-700 mt-0.5">
                    {formatDateSafe(selectedWorker.registeredAt)}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-mono text-3xs uppercase">
                    Attended Timestamp
                  </span>
                  <div className="font-mono text-ink-700 mt-0.5">
                    {selectedWorker.attended
                      ? formatDateSafe(selectedWorker.attendedAt)
                      : "Not attended yet"}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {!selectedWorker.attended ? (
                  <Link
                    to="/scan/wb26"
                    state={{ from: "/admin/workers-ball-registrations" }}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-semibold"
                  >
                    <CameraIcon className="h-4 w-4" />
                    <span>Open Scanner to accredit this pass</span>
                  </Link>
                ) : (
                  <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                    <CheckCircleIcon className="h-4 w-4" />
                    Check-in verified and logged
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedWorker(null)}
                  className="w-full sm:w-auto rounded-lg border border-ink-200 px-4 py-2 text-xs font-medium text-ink hover:bg-ink-100 transition"
                >
                  Close Record
                </button>
              </div>
            </div>
          </GenericModal>
        )}
      </div>
    </Layout>
  );
}
