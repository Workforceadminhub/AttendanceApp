import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Stat, Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { fetchTrainings } from "../../../services/hub/trainings";
import { getUserRole } from "../../../utils/getUserRole";
import { asDate, kindLabel, statusTone } from "../../../utils/training";
import {
  CohortManagementDrawer,
  TrainingDetailDrawer,
  TrainingFormDrawer,
} from "./TrainingManagementDrawer";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "ongoing", label: "Ongoing" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "training", label: "Training" },
  { value: "conference", label: "Conference" },
  { value: "webinar", label: "Webinar" },
  { value: "orientation", label: "Orientation" },
  { value: "leadership", label: "Leadership" },
  { value: "skills", label: "Skills" },
];

const PER_PAGE = 20;

export default function TrainingList() {
  const navigate = useNavigate();
  const userRoleInfo = useMemo(() => getUserRole(), []);
  const { isSuperAdmin, isChurchAdmin, isHOD, isAdmin, user } = userRoleInfo;

  // Determine active role view strictly based on authenticated permission level
  const activeRoleView = (isSuperAdmin || isChurchAdmin || isAdmin)
    ? "admin"
    : isHOD
    ? "hod"
    : "worker";

  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const canCreate = useCanAction("create_training");
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [formDrawer, setFormDrawer] = useState(null);
  const [cohortTraining, setCohortTraining] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hub-trainings", { status, category, search, page }],
    queryFn: () => fetchTrainings({ status, category, search, page, per_page: PER_PAGE }),
  });

  const trainings = data?.data ?? [];
  const metrics = data?.metrics ?? {};
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  // User Department for HOD view filtering
  const userDepartment = user?.department || "Department";

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          {/* Role 1: Operations / Training Admin View */}
          {activeRoleView === "admin" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="qc-eyebrow text-ink-500 font-semibold">Super Admin &amp; Church Admin Console</div>
                  <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                    Learning Dashboard
                  </h1>
                  <p className="mt-1 text-sm text-ink-500">
                    Manage organization-wide training modules, cohorts, and certification metrics.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link to="/hub/trainings/programs" className="qc-btn-secondary">
                    Training Programs
                  </Link>
                  <Link to="/hub/certificates/inventory" className="qc-btn-secondary">
                    Certificate Inventory
                  </Link>
                  <Link to="/hub/certificates/templates" className="qc-btn-secondary">
                    Certificate Studio
                  </Link>
                  {(canCreate || isSuperAdmin || isChurchAdmin) && (
                    <button type="button" onClick={() => setFormDrawer({ mode: "create" })} className="qc-btn-primary">
                      + Create Training
                    </button>
                  )}
                </div>
              </div>

              {/* Summary Stat Cards (BE-T14) */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <Stat label="Total Trainings" value={metrics.total_trainings ?? 0} loading={isLoading} />
                <Stat label="Ongoing" value={metrics.ongoing_trainings ?? 0} loading={isLoading} />
                <Stat label="Upcoming" value={metrics.upcoming_trainings ?? 0} loading={isLoading} />
                <Stat label="Completed" value={metrics.completed_trainings ?? 0} loading={isLoading} />
                <Stat label="Total Enrollees" value={metrics.total_enrollees ?? 0} loading={isLoading} />
                <Stat
                  label="Certificates Issued"
                  value={metrics.total_certificates_issued ?? 0}
                  loading={isLoading}
                />
              </div>
            </>
          )}

          {/* Role 2: Department Leader (HOD) View */}
          {activeRoleView === "hod" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="qc-eyebrow text-ink-500 font-semibold">HOD Department Hub</div>
                  <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                    {userDepartment} Training Management
                  </h1>
                  <p className="mt-1 text-sm text-ink-500">
                    Track training compliance and nominate workers in {userDepartment}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link to="/hub/certificates" className="qc-btn-secondary">
                    Certificates
                  </Link>
                  <Link to="/hub/trainings/cohorts" className="qc-btn-primary">
                    Cohorts
                  </Link>
                </div>
              </div>

              {/* HOD Specific Summary Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Total Trainings" value={metrics.total_trainings ?? 0} loading={isLoading} />
                <Stat label="Ongoing" value={metrics.ongoing_trainings ?? 0} loading={isLoading} />
                <Stat label="Dept Enrollees" value={metrics.total_enrollees ?? 0} loading={isLoading} />
                <Stat
                  label="Certificates Issued"
                  value={metrics.total_certificates_issued ?? 0}
                  loading={isLoading}
                />
              </div>
            </>
          )}

          {/* Role 3: Worker Trainee View */}
          {activeRoleView === "worker" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="qc-eyebrow text-ink-500 font-semibold">My Trainee Portal</div>
                  <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                    My Learning &amp; Development
                  </h1>
                  <p className="mt-1 text-sm text-ink-500">
                    View your active training modules, progress, and download earned certificates.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link to="/hub/trainings/nominations" className="qc-btn-secondary">
                    My Nominations &amp; RSVPs
                  </Link>
                  <Link to="/hub/certificates" className="qc-btn-primary">
                    My Certificates
                  </Link>
                </div>
              </div>

              {/* Worker Trainee Specific Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Available Trainings" value={metrics.total_trainings ?? 0} loading={isLoading} />
                <Stat label="Ongoing" value={metrics.ongoing_trainings ?? 0} loading={isLoading} />
                <Stat label="Completed" value={metrics.completed_trainings ?? 0} loading={isLoading} />
                <Stat
                  label="Certificates Issued"
                  value={metrics.total_certificates_issued ?? 0}
                  loading={isLoading}
                />
              </div>
            </>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Status tabs */}
            <div className="flex gap-1 border border-ink-200 rounded-md p-0.5 bg-white">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setStatus(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    status === tab.key
                      ? "bg-ink-900 text-cream"
                      : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="qc-input w-auto"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder={
                activeRoleView === "worker"
                  ? "Search my trainings..."
                  : activeRoleView === "hod"
                  ? "Search department trainings..."
                  : "Search all trainings..."
              }
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="qc-input flex-1"
            />
          </div>

          {/* Main Content Table & Cards View */}
          <div className="qc-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading trainings...</div>
            ) : trainings.length === 0 ? (
              <div className="p-8 text-center text-ink-500">No trainings found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-cream-200">
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Training Module</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Next Session</th>
                      <th className="text-right px-4 py-3 font-medium text-ink-700">
                        {activeRoleView === "worker" ? "My Progress" : activeRoleView === "hod" ? "Dept Enrollees" : "Enrolled"}
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-ink-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {trainings.map((t) => (
                      <TrainingRow
                        key={t.id}
                        training={t}
                        activeRoleView={activeRoleView}
                        onManage={() => setSelectedTraining(t)}
                        onOpen={() => navigate(`/hub/trainings/${t.id}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-500">
                Page <span className="qc-num">{page}</span> of <span className="qc-num">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="qc-btn-secondary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="qc-btn-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        {selectedTraining && (
          <TrainingDetailDrawer
            trainingId={selectedTraining.id || selectedTraining._id}
            fallbackTraining={selectedTraining}
            onClose={() => setSelectedTraining(null)}
            onManageCohorts={() => {
              setCohortTraining(selectedTraining);
              setSelectedTraining(null);
            }}
            onEdit={(training) => {
              setSelectedTraining(null);
              setFormDrawer({ mode: "edit", training });
            }}
          />
        )}
        {formDrawer && (
          <TrainingFormDrawer
            mode={formDrawer.mode}
            initialTraining={formDrawer.training}
            onClose={() => setFormDrawer(null)}
            onSaved={() => setFormDrawer(null)}
          />
        )}
        {cohortTraining && (
          <CohortManagementDrawer
            trainingId={cohortTraining.id || cohortTraining._id}
            trainingName={cohortTraining.name}
            onClose={() => setCohortTraining(null)}
          />
        )}
      </Layout>
    </>
  );
}

/**
 * One training row. At a glance it carries the four facts the brief asks for:
 * classification, status, enrolled count and next session date.
 */
function TrainingRow({ training, activeRoleView, onManage, onOpen }) {
  const status = String(training.status ?? "").toLowerCase();
  const enrolled = training.number_of_enrollees ?? 0;
  const capacity = training.capacity;
  const nextSession = asDate(training.next_session_date) || asDate(training.start_date);
  const progress = status === "completed" ? 100 : status === "ongoing" ? 60 : 0;

  return (
    <tr className="hover:bg-cream-200 transition-colors">
      <td
        className="px-4 py-3 font-medium text-ink-900 cursor-pointer"
        onClick={activeRoleView === "admin" ? onManage : onOpen}
      >
        <div>{training.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="qc-eyebrow text-ink-400 capitalize">{training.category}</span>
          <span className="text-ink-300">&middot;</span>
          <span className="qc-eyebrow text-ink-400 capitalize">{training.mode}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Tag tone="neutral">{kindLabel(training)}</Tag>
      </td>
      <td className="px-4 py-3">
        <Tag tone={statusTone(status)} live={status === "ongoing"}>
          {training.status}
        </Tag>
      </td>
      <td className="px-4 py-3">
        <div className="qc-num text-xs text-ink-700">{nextSession || "-"}</div>
        <div className="qc-eyebrow text-ink-400">next session</div>
      </td>
      <td className="px-4 py-3 text-right qc-num">
        {activeRoleView === "worker" ? (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 bg-ink-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${progress === 100 ? "bg-forest" : "bg-sienna"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-ink-700">{progress}%</span>
          </div>
        ) : (
          <>
            <span className="text-ink-900">{enrolled}</span>
            {capacity ? <span className="text-ink-400">/{capacity}</span> : null}
          </>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {activeRoleView === "worker" ? (
          <Link
            to={`/hub/trainings/${training.id}`}
            className="text-xs font-semibold text-ink-900 hover:text-ink-700 underline underline-offset-2"
          >
            {status === "ongoing" ? "Continue" : "View Details"}
          </Link>
        ) : activeRoleView === "hod" ? (
          <Link
            to={`/hub/trainings/${training.id}/nominate`}
            className="text-xs font-semibold text-ink-900 hover:text-ink-700 underline underline-offset-2"
          >
            Nominate
          </Link>
        ) : (
          <button
            type="button"
            onClick={onManage}
            className="text-xs font-semibold text-ink-700 hover:text-ink-900"
          >
            Manage &rarr;
          </button>
        )}
      </td>
    </tr>
  );
}
