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
  fetchAwakeningRegistrations,
  updateAwakeningRegistration,
  deleteAwakeningRegistration,
} from "../services/awakeningConference";
import {
  AWAKENING_CAMPUSES,
  AWAKENING_ATTENDANCE_DAYS,
  AWAKENING_SERVING_DAYS,
  AWAKENING_SERVICE_TEAMS,
  AWAKENING_CELL_DESIGNATIONS,
} from "../utils/schemas";
import { getUserRole } from "../utils/getUserRole";
import { getEffectiveRouteList } from "../utils/routeObject";
import { teams, workerRoles } from "../utils/teams";
import { exportAwakeningWorkbook } from "../utils/exportAwakening";
import {
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

const ALL_CAMPUSES = ["All Campuses", ...AWAKENING_CAMPUSES];
const ALL_TYPES = ["All Types", "attendee", "worker"];
const ALL_TEAMS = ["All Teams", ...AWAKENING_SERVICE_TEAMS];

export const AWAKENING_TEAM_OPTIONS = teams.map((t) => t.value);
export const AWAKENING_DEPARTMENT_OPTIONS = Array.from(
  new Set(getEffectiveRouteList().map((d) => d.department).filter(Boolean))
).sort();
export const AWAKENING_ROLE_OPTIONS = [...workerRoles];

const PAGE_LIMIT = 15;

// ── Display helpers ───────────────────────────────────────────────────────────

const dayLabel = (value) =>
  AWAKENING_ATTENDANCE_DAYS.find((d) => d.value === value)?.label ?? value;
const servingDayLabel = (value) =>
  AWAKENING_SERVING_DAYS.find((d) => d.value === value)?.label ?? value;
const foundationLabel = (value) => ({
  yes: "Completed",
  no: "Not completed",
  not_yet_but_would_love_to: "Wants to",
}[value] ?? value);
const yesNoLabel = (v) => (v === "yes" ? "Yes" : v === "no" ? "No" : "—");

function DaysList({ values }) {
  if (!values?.length) return <span>—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {values.map((d) => (
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
      [r.first_name, r.last_name].filter(Boolean).join(" ") || "—",
  },
  { key: "campus", header: "Campus", secondary: true, render: (r) => r.campus || "—" },
  {
    key: "registration_type",
    header: "Type",
    trailing: true,
    render: (r) => (
      <Tag tone={r.registration_type === "worker" ? "warning" : "success"}>
        {r.registration_type || "—"}
      </Tag>
    ),
  },
  {
    key: "worker_team",
    header: "Worker Team",
    render: (r) => r.worker_team || "—",
  },
  {
    key: "department",
    header: "Department",
    render: (r) => r.department || "—",
  },
  {
    key: "worker_designation",
    header: "Designation",
    render: (r) => r.worker_designation || "—",
  },
  {
    key: "preferred_service_team",
    header: "Service Team",
    hideOnSm: true,
    render: (r) => r.preferred_service_team || "—",
  },
  {
    key: "serving_day",
    header: "Serving Day",
    hideOnSm: true,
    render: (r) => (r.serving_day ? servingDayLabel(r.serving_day) : "—"),
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

// ── Edit modal ────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink transition";

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
    serving_day: registration.serving_day ?? "",
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
      };
      if (form.belongs_to_cell === "yes") payload.cell_designation = form.cell_designation;
      if (isWorker) {
        payload.worker_team = form.worker_team;
        payload.department = form.department;
        payload.worker_designation = form.worker_designation;
        payload.preferred_service_team = form.preferred_service_team;
        payload.serving_day = form.serving_day;
        payload.join_prayer_team = form.join_prayer_team;
        payload.lead_prayer_team = form.lead_prayer_team;
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
                {AWAKENING_SERVICE_TEAMS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Serving Day</label>
              <select className={inputClass} value={form.serving_day} onChange={set("serving_day")}>
                <option value="">Select day</option>
                {AWAKENING_SERVING_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
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

  // Role guard — super-admin / church-admin only (canonical resolver)
  useEffect(() => {
    const { isSuperAdmin, isChurchAdmin } = getUserRole();
    if (!isSuperAdmin && !isChurchAdmin) {
      toast.error("Access denied.");
      navigate("/login");
    }
  }, [navigate]);

  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // debounced separately
  const [campus, setCampus] = useState("All Campuses");
  const [regType, setRegType] = useState("All Types");
  const [team, setTeam] = useState("All Teams");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const count = await exportAwakeningWorkbook({
        search,
        campus,
        registrationType: regType,
        serviceTeam: team,
      });
      toast.success(`Exported ${count} registration${count !== 1 ? "s" : ""} — one sheet per campus.`);
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
          {!isLoading && (
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
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-2 text-sm font-medium text-white transition hover:bg-forest/90 disabled:opacity-60 disabled:cursor-not-allowed sm:ml-auto"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Report"}
          </button>
        </div>

        {/* Table */}
        <DataTable
          columns={[...columns, actionsColumn]}
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

      {editing && (
        <EditModal
          registration={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {deleting && (
        <DeleteModal
          registration={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={load}
        />
      )}
    </Layout>
  );
}
