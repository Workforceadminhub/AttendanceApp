import { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../components/Layout";
import DataTable from "../components/ui/DataTable";
import Tag from "../components/ui/Tag";
import { fetchRegistrations } from "../services/leadershipRegistrations";
import { getUserRole } from "../utils/getUserRole";
import { getPostLoginPath } from "../utils/routeObject";
import { ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

const CAMPUSES = [
  "All Campuses", "Gbagada", "Magodo", "Ikorodu", "Jericho", "Yaba",
  "Ilupeju", "Akobo", "Apapa", "Port Harcourt", "Oluyole", "Surulere", "Ogba", "Toronto",
];

const COURSES = ["All Courses", "BLC", "ALC"];

const PAGE_LIMIT = 15;

const columns = [
  {
    key: "fullName",
    header: "Name",
    primary: true,
    render: (r) => r.fullName,
  },
  {
    key: "campus",
    header: "Campus",
    secondary: true,
    render: (r) => r.campus,
  },
  {
    key: "course",
    header: "Course",
    trailing: true,
    render: (r) => (
      <Tag
        label={r.course}
        color={r.course === "BLC" ? "forest" : "mustard"}
      />
    ),
  },
  {
    key: "leadershipStatus",
    header: "Status",
    hideOnSm: true,
    render: (r) => r.leadershipStatus,
  },
  {
    key: "leadershipRole",
    header: "Role",
    hideOnSm: true,
    render: (r) => r.leadershipRole || "-",
  },
  {
    key: "email",
    header: "Email",
    hideOnSm: true,
    render: (r) => r.email,
  },
  {
    key: "phoneNumber",
    header: "Phone",
    mono: true,
    hideOnSm: true,
    render: (r) => r.phoneNumber,
  },
  {
    key: "sex",
    header: "Sex",
    hideOnSm: true,
    render: (r) => r.sex,
  },
];

export default function LeadershipRegistrationAdmin() {
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [isLoading, setIsLoading] = useState(true);

  const [campus, setCampus] = useState("All Campuses");
  const [course, setCourse] = useState("All Courses");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // debounced separately
  const [page, setPage] = useState(1);

  const { isSuperAdmin, isChurchAdmin, user } = getUserRole();
  const hasAccess = isSuperAdmin || isChurchAdmin;

  // Auth guard
  useEffect(() => {
    if (!hasAccess) {
      toast.error("Access denied.");
      navigate(getPostLoginPath(user), { replace: true });
    }
  }, [hasAccess, navigate, user]);

  // Debounce search input → only fire after 400ms of no typing
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [campus, course]);

  // Fetch
  const load = useCallback(async () => {
    if (!hasAccess) return;
    setIsLoading(true);
    try {
      const result = await fetchRegistrations({ page, limit: PAGE_LIMIT, campus, course, search });
      setRegistrations(result.data);
      setPagination(result.pagination);
    } catch (err) {
      toast.error(err.message || "Failed to load registrations.");
    } finally {
      setIsLoading(false);
    }
  }, [hasAccess, page, campus, course, search]);

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess, load]);

  if (!hasAccess) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  const selectClass =
    "rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink transition";

  return (
    <Layout>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back link */}
        <Link
          to="/attendance/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-ink-500 mb-1">
              Leadership Training
            </p>
            <h1 className="text-2xl font-semibold text-ink">ALC/BLC Registrations</h1>
          </div>
          {!isLoading && (
            <span className="text-sm text-ink-500 font-mono">
              {pagination.total} total record{pagination.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search name, email, phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`${selectClass} w-full sm:w-64`}
          />
          <select
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            className={selectClass}
          >
            {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className={selectClass}
          >
            {COURSES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          rows={registrations}
          rowKey={(r, i) => r.id ?? i}
          loading={isLoading}
          loadingRows={PAGE_LIMIT}
          empty="No registrations found."
        />

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-ink-500 font-mono">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink transition hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink transition hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
