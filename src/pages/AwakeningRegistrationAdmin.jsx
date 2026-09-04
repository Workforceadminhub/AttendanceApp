import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Layout from "../components/Layout";
import DataTable from "../components/ui/DataTable";
import Tag from "../components/ui/Tag";
import GenericModal from "../components/GenericModal";
import AwakeningBulkUploadModal from "../components/AwakeningBulkUploadModal";
import {
  fetchAllAwakeningRegistrations,
  fetchAwakeningRegistrations,
  updateAwakeningRegistration,
  deleteAwakeningRegistration,
} from "../services/awakeningConference";
import {
  AWAKENING_CAMPUSES,
  AWAKENING_SERVING_DAYS,
  AWAKENING_SERVICE_TEAMS,
  AWAKENING_CELL_DESIGNATIONS,
} from "../utils/schemas";
import { getUserRole } from "../utils/getUserRole";
import { getEffectiveRouteList } from "../utils/routeObject";
import { teams, workerRoles } from "../utils/teams";
import { exportAwakeningWorkbook } from "../utils/exportAwakening";
import {
  formatAwakeningDays,
  getAwakeningDepartmentOptions,
  getAwakeningServiceTeamQueryValues,
  normalizeAwakeningDays,
  normalizeAwakeningDepartment,
  normalizeAwakeningServiceTeam,
} from "../utils/awakeningRegistration";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

const ALL_CAMPUSES = ["All Campuses", ...AWAKENING_CAMPUSES];
const ALL_TYPES = ["All Types", "attendee", "worker"];
const ALL_TEAMS = ["All Teams", ...AWAKENING_SERVICE_TEAMS];

export const AWAKENING_TEAM_OPTIONS = teams.map((t) => t.value);
export const AWAKENING_DEPARTMENT_OPTIONS = getAwakeningDepartmentOptions(
  getEffectiveRouteList()
);
export const AWAKENING_ROLE_OPTIONS = [...workerRoles];

const PAGE_LIMIT = 15;

// ── Display helpers ───────────────────────────────────────────────────────────

const dayLabel = (value) => formatAwakeningDays(value);
const foundationLabel = (value) => ({
  yes: "Completed",
  no: "Not completed",
  not_yet_but_would_love_to: "Wants to",
}[value] ?? value);
const yesNoLabel = (v) => (v === "yes" ? "Yes" : v === "no" ? "No" : "-");

function DaysList({ values }) {
  const days = Array.isArray(values) ? values : values ? [values] : [];
  if (!days.length) return <span>-</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {days.map((d) => (
        <span key={d} className="rounded bg-ink-100 px-1.5 py-0.5 text-2xs text-ink-700">
          {dayLabel(d)}
        </span>
      ))}
    </span>
  );
}

const columns = [
  {
    key: "name",
    header: "Name",
    primary: true,
    render: (r) =>
      [r.first_name, r.last_name].filter(Boolean).join(" ") || "-",
  },
  { key: "campus", header: "Campus", secondary: true, render: (r) => r.campus || "-" },
  {
    key: "registration_type",
    header: "Type",
    trailing: true,
    render: (r) => (
      <Tag tone={r.registration_type === "worker" ? "warning" : "success"}>
        {r.registration_type || "-"}
      </Tag>
    ),
  },
  {
    key: "worker_team",
    header: "Worker Team",
    render: (r) => r.worker_team || "-",
  },
  {
    key: "department",
    header: "Department",
    render: (r) => normalizeAwakeningDepartment(r.department) || "-",
  },
  {
    key: "worker_designation",
    header: "Designation",
    render: (r) => r.worker_designation || "-",
  },
  {
    key: "preferred_service_team",
    header: "Service Team",
    hideOnSm: true,
    render: (r) => normalizeAwakeningServiceTeam(r.preferred_service_team) || "-",
  },
  {
    key: "serving_day",
    header: "Serving Days",
    render: (r) => formatAwakeningDays(r.serving_day),
  },
  {
    key: "attendance_day",
    header: "Attending",
    render: (r) => <DaysList values={r.attendance_day} />,
  },
  {
    key: "cell",
    header: "Cell",
    hideOnSm: true,
    render: (r) =>
      r.belongs_to_cell === "yes"
        ? r.cell_designation || "Yes"
        : "No",
  },
  {
    key: "foundation_course_status",
    header: "Foundation",
    hideOnSm: true,
    render: (r) => foundationLabel(r.foundation_course_status),
  },
  {
    key: "phone",
    header: "Phone",
    mono: true,
    hideOnSm: true,
    render: (r) => r.phone,
  },
  { key: "email", header: "Email", hideOnSm: true, render: (r) => r.email },
];

function countBy(rows, getValue) {
  const counts = new Map();
  rows.forEach((row) => {
    const value = getValue(row);
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts]
    .map(([name, registrations]) => ({ name, registrations }))
    .sort((a, b) => b.registrations - a.registrations || a.name.localeCompare(b.name));
}

function RegistrationOverview({ rows, loading }) {
  if (loading) {
    return <div className="h-80 rounded-xl border border-ink-200 bg-white" aria-busy="true" />;
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white px-5 py-12 text-center text-sm text-ink-500">
        No registrations match the current filters.
      </div>
    );
  }

  const registrationTypes = countBy(rows, (row) =>
    row.registration_type === "worker" ? "Workers" : "Attendees"
  );
  const serviceTeams = countBy(rows, (row) =>
    normalizeAwakeningServiceTeam(row.preferred_service_team)
  );
  const displayedServiceTeams = serviceTeams.slice(0, 12);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-6">
      <section className="rounded-xl border border-ink-200 bg-white p-5" aria-labelledby="registration-mix-heading">
        <div className="mb-4">
          <h2 id="registration-mix-heading" className="text-base font-semibold text-ink">Registration mix</h2>
          <p className="mt-1 text-sm text-ink-500">{rows.length} matching registration{rows.length === 1 ? "" : "s"}</p>
        </div>
        <div className="h-64" role="img" aria-label="Registrations split by attendee and worker type">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={registrationTypes} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#e4e1da" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#57534e", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#57534e", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f4f1ea" }} formatter={(value) => [value, "Registrations"]} />
              <Bar dataKey="registrations" fill="#22543d" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-ink-200 bg-white p-5" aria-labelledby="service-team-heading">
        <div className="mb-4">
          <h2 id="service-team-heading" className="text-base font-semibold text-ink">Workers by service team</h2>
          <p className="mt-1 text-sm text-ink-500">
            {serviceTeams.length > displayedServiceTeams.length
              ? `Showing the first ${displayedServiceTeams.length} of ${serviceTeams.length} teams.`
              : "Historical team names are grouped under the current categories."}
          </p>
        </div>
        {displayedServiceTeams.length ? (
          <div className="h-80" role="img" aria-label="Worker registrations grouped by normalized service team">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayedServiceTeams} layout="vertical" margin={{ top: 0, right: 18, left: 18, bottom: 0 }}>
                <CartesianGrid stroke="#e4e1da" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#57534e", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={142} tick={{ fill: "#57534e", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f4f1ea" }} formatter={(value) => [value, "Workers"]} />
                <Bar dataKey="registrations" fill="#b7791f" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-80 items-center justify-center text-sm text-ink-500">No worker service-team data yet.</div>
        )}
      </section>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink transition";

function NormalizedLegacyOption({ value, options, normalize }) {
  if (!value || options.includes(value)) return null;
  const label = normalize(value);
  if (!label || label === value) return null;
  return <option value={value}>{label}</option>;
}

function EditModal({ registration, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: registration.first_name ?? "",
    last_name: registration.last_name ?? "",
    phone: registration.phone ?? "",
    email: registration.email ?? "",
    campus: registration.campus ?? "",
    registration_type: registration.registration_type ?? "attendee",
    belongs_to_cell: registration.belongs_to_cell ?? "no",
    cell_designation: registration.cell_designation ?? "",
    foundation_course_status: registration.foundation_course_status ?? "",
    worker_team: registration.worker_team ?? "",
    department: registration.department ?? "",
    worker_designation: registration.worker_designation ?? "",
    preferred_service_team: registration.preferred_service_team ?? "",
    serving_day: normalizeAwakeningDays(registration.serving_day),
    join_prayer_team: registration.join_prayer_team ?? "no",
    lead_prayer_team: registration.lead_prayer_team ?? "no",
  });
  const [isSaving, setIsSaving] = useState(false);

  const isWorker = form.registration_type === "worker";
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email,
        campus: form.campus,
        registration_type: form.registration_type,
        belongs_to_cell: form.belongs_to_cell,
        foundation_course_status: form.foundation_course_status,
        join_prayer_team: isWorker ? form.join_prayer_team : "no",
        lead_prayer_team: isWorker ? form.lead_prayer_team : "no",
      };
      if (form.belongs_to_cell === "yes") payload.cell_designation = form.cell_designation;
      if (isWorker) {
        payload.worker_team = form.worker_team;
        payload.department = form.department;
        payload.worker_designation = form.worker_designation;
        payload.preferred_service_team = form.preferred_service_team;
        payload.serving_day = form.serving_day;
      }
      await updateAwakeningRegistration(registration.id, payload);
      toast.success("Registration updated.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to update registration.");
    } finally {
      setIsSaving(false);
    }
  };

  const labelCls = "block text-xs font-medium text-ink-500 mb-1";

  return (
    <GenericModal isOpen onClose={onClose} title="Edit Registration" size="large">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>First Name</label>
          <input className={inputClass} value={form.first_name} onChange={set("first_name")} />
        </div>
        <div>
          <label className={labelCls}>Last Name</label>
          <input className={inputClass} value={form.last_name} onChange={set("last_name")} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputClass} value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputClass} type="email" value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className={labelCls}>Campus</label>
          <select className={inputClass} value={form.campus} onChange={set("campus")}>
            {AWAKENING_CAMPUSES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Registration Type</label>
          <select className={inputClass} value={form.registration_type} onChange={set("registration_type")}>
            <option value="attendee">Attendee</option>
            <option value="worker">Worker</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Belongs to Cell</label>
          <select className={inputClass} value={form.belongs_to_cell} onChange={set("belongs_to_cell")}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        {form.belongs_to_cell === "yes" && (
          <div>
            <label className={labelCls}>Cell Designation</label>
            <select className={inputClass} value={form.cell_designation} onChange={set("cell_designation")}>
              <option value="">Select</option>
              {AWAKENING_CELL_DESIGNATIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={labelCls}>Foundation Course Status</label>
          <select className={inputClass} value={form.foundation_course_status} onChange={set("foundation_course_status")}>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="not_yet_but_would_love_to">Not yet, but would love to</option>
          </select>
        </div>
        {isWorker && (
          <>
            <div>
              <label className={labelCls}>Worker Team</label>
              <select className={inputClass} value={form.worker_team} onChange={set("worker_team")}>
                <option value="">Select team</option>
                {AWAKENING_TEAM_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select className={inputClass} value={form.department} onChange={set("department")}>
                <option value="">Select department</option>
                <NormalizedLegacyOption
                  value={form.department}
                  options={AWAKENING_DEPARTMENT_OPTIONS}
                  normalize={normalizeAwakeningDepartment}
                />
                {AWAKENING_DEPARTMENT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Worker Designation</label>
              <select className={inputClass} value={form.worker_designation} onChange={set("worker_designation")}>
                <option value="">Select designation</option>
                {AWAKENING_ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Preferred Service Team</label>
              <select className={inputClass} value={form.preferred_service_team} onChange={set("preferred_service_team")}>
                <option value="">Select team</option>
                <NormalizedLegacyOption
                  value={form.preferred_service_team}
                  options={AWAKENING_SERVICE_TEAMS}
                  normalize={normalizeAwakeningServiceTeam}
                />
                {AWAKENING_SERVICE_TEAMS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Preferred Serving Days</label>
              <div className="flex flex-wrap gap-1.5">
                {AWAKENING_SERVING_DAYS.map((d) => (
                  <label key={d.value}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition ${
                      form.serving_day.includes(d.value)
                        ? "border-ink bg-ink text-cream"
                        : "border-ink-200 bg-white text-ink hover:bg-ink-100"
                    }`}>
                    <input type="checkbox" className="sr-only"
                      checked={form.serving_day.includes(d.value)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          serving_day: e.target.checked
                            ? [...f.serving_day, d.value]
                            : f.serving_day.filter((v) => v !== d.value),
                        }))
                      } />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Join Prayer Team</label>
              <select className={inputClass} value={form.join_prayer_team} onChange={set("join_prayer_team")}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Lead Prayer Team</label>
              <select className={inputClass} value={form.lead_prayer_team} onChange={set("lead_prayer_team")}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-ink-200 px-4 py-2 text-sm text-ink transition hover:bg-ink-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </GenericModal>
  );
}

// ── Delete modal ──────────────────────────────────────────────────────────────

function DeleteModal({ registration, onClose, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAwakeningRegistration(registration.id);
      toast.success("Registration deleted.");
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to delete registration.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <GenericModal isOpen onClose={onClose} title="Delete Registration" size="small">
      <p className="text-sm text-ink">
        Delete the registration for{" "}
        <span className="font-medium">
          {[registration.first_name, registration.last_name].filter(Boolean).join(" ")}
        </span>
        ? This cannot be undone.
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-ink-200 px-4 py-2 text-sm text-ink transition hover:bg-ink-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg bg-brick px-4 py-2 text-sm font-medium text-white transition hover:bg-brick/90 disabled:opacity-60"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </GenericModal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AwakeningRegistrationAdmin() {
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState([]);
  const [overviewRegistrations, setOverviewRegistrations] = useState([]);

  // Role guard - super-admin / church-admin only (canonical resolver)
  useEffect(() => {
    const { isSuperAdmin, isChurchAdmin } = getUserRole();
    if (!isSuperAdmin && !isChurchAdmin) {
      toast.error("Access denied.");
      navigate("/login");
    }
  }, [navigate]);

  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [view, setView] = useState("overview");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // debounced separately
  const [campus, setCampus] = useState("All Campuses");
  const [regType, setRegType] = useState("All Types");
  const [team, setTeam] = useState("All Teams");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Debounce search input → only fire after 400ms of no typing
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [campus, regType, team]);

  // Fetch
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const serviceTeamValues = getAwakeningServiceTeamQueryValues(team);
      if (serviceTeamValues.length > 1) {
        const rows = await fetchAllAwakeningRegistrations({
          search,
          campus,
          registrationType: regType,
          serviceTeam: team,
        });
        const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_LIMIT));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * PAGE_LIMIT;
        setRegistrations(rows.slice(start, start + PAGE_LIMIT));
        setPagination({
          page: safePage,
          total: rows.length,
          totalPages,
          hasNext: safePage < totalPages,
          hasPrev: safePage > 1,
        });
        return;
      }
      const result = await fetchAwakeningRegistrations({
        page,
        limit: PAGE_LIMIT,
        search,
        campus,
        registrationType: regType,
        serviceTeam: team,
      });
      setRegistrations(result.data);
      setPagination(result.pagination);
    } catch (err) {
      toast.error(err.message || "Failed to load registrations.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, campus, regType, team]);

  const loadOverview = useCallback(async () => {
    setIsOverviewLoading(true);
    try {
      const rows = await fetchAllAwakeningRegistrations({
        search,
        campus,
        registrationType: regType,
        serviceTeam: team,
      });
      setOverviewRegistrations(rows);
    } catch (err) {
      toast.error(err.message || "Failed to load registration overview.");
    } finally {
      setIsOverviewLoading(false);
    }
  }, [search, campus, regType, team]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (view === "list") load(); }, [view, load]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const count = await exportAwakeningWorkbook({
        search,
        campus,
        registrationType: regType,
        serviceTeam: team,
      });
      toast.success(`Exported ${count} registration${count !== 1 ? "s" : ""} - one sheet per campus.`);
    } catch (err) {
      toast.error(err.message || "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const selectClass =
    "rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink transition";

  const actionsColumn = {
    key: "actions",
    header: "Actions",
    render: (r) => (
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Edit ${r.first_name} ${r.last_name}`}
          onClick={() => setEditing(r)}
          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink transition"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${r.first_name} ${r.last_name}`}
          onClick={() => setDeleting(r)}
          className="rounded-md p-1.5 text-brick/70 hover:bg-brick/10 hover:text-brick transition"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </span>
    ),
  };

  return (
    <Layout>
      <Header />

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
              Awakening Conference
            </p>
            <h1 className="text-2xl font-semibold text-ink">Conference Registrations</h1>
          </div>
          {view === "overview" && !isOverviewLoading && (
            <span className="text-sm text-ink-500 font-mono">
              {overviewRegistrations.length} total record{overviewRegistrations.length !== 1 ? "s" : ""}
            </span>
          )}
          {view === "list" && !isLoading && (
            <span className="text-sm text-ink-500 font-mono">
              {pagination.total} total record{pagination.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Filters + export */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search name, email, phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`${selectClass} w-full sm:w-64`}
          />
          <select value={campus} onChange={(e) => setCampus(e.target.value)} className={selectClass}>
            {ALL_CAMPUSES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={regType} onChange={(e) => setRegType(e.target.value)} className={selectClass}>
            <option value="All Types">All Types</option>
            <option value="attendee">Attendee</option>
            <option value="worker">Worker</option>
          </select>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectClass}>
            {ALL_TEAMS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-300 px-3 py-2 text-sm font-medium text-ink transition hover:bg-ink-100"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Bulk Upload
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-2 text-sm font-medium text-white transition hover:bg-forest/90 disabled:opacity-60 disabled:cursor-not-allowed sm:ml-auto"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Report"}
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1" role="tablist" aria-label="Registration view">
          <button
            type="button"
            role="tab"
            aria-selected={view === "overview"}
            onClick={() => setView("overview")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${view === "overview" ? "bg-ink text-cream" : "text-ink-600 hover:bg-ink-100"}`}
          >
            <ChartBarIcon className="h-4 w-4" />
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "list"}
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${view === "list" ? "bg-ink text-cream" : "text-ink-600 hover:bg-ink-100"}`}
          >
            <ListBulletIcon className="h-4 w-4" />
            View list
          </button>
        </div>

        {view === "overview" ? (
          <RegistrationOverview rows={overviewRegistrations} loading={isOverviewLoading} />
        ) : (
          <>
            <DataTable
              columns={[...columns, actionsColumn]}
              rows={registrations}
              rowKey={(r, i) => r.id ?? i}
              loading={isLoading}
              loadingRows={PAGE_LIMIT}
              empty="No registrations found."
            />
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
          </>
        )}
      </div>

      {editing && (
        <EditModal
          registration={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            load();
            loadOverview();
          }}
        />
      )}
      {deleting && (
        <DeleteModal
          registration={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            load();
            loadOverview();
          }}
        />
      )}
      {showBulkUpload && (
        <AwakeningBulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onComplete={() => {
            load();
            loadOverview();
          }}
        />
      )}
    </Layout>
  );
}
