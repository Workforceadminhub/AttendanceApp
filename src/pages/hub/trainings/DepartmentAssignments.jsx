import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Stat, Tag } from "../../../components/ui";
import { useEffectiveRouteList } from "../../../contexts/DepartmentsContext";
import { getUserRole } from "../../../utils/getUserRole";
import { getNextSunday } from "../../../utils/getDate";
import {
  fetchTraining,
  fetchDeptAssignments,
  fetchSessions,
  createDeptAssignment,
} from "../../../services/hub/trainings";
import { hubGet } from "../../../services/hub/client";
import {
  PARTICIPATION_THRESHOLD,
  asDate,
  completionFor,
  daysServed,
  display,
  formatDate,
  initials,
  unwrapData,
  unwrapTrainingDetail,
  workerIdOf,
  workerNameOf,
} from "../../../utils/training";

/**
 * FE-T11 "In Training" department view.
 *
 * Workers who cleared this level are assigned to a department and serve toward
 * the next one. The leader watches two clocks per worker: time served against
 * the required duration, and participation across the training's sessions.
 * Both must clear before the next level unlocks.
 */
export default function DepartmentAssignments() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isSuperAdmin, isChurchAdmin, isAdmin, user } = getUserRole();
  const routeList = useEffectiveRouteList();

  const canPickAnyDepartment = isSuperAdmin || isChurchAdmin || isAdmin;
  const departments = useMemo(() => {
    if (!canPickAnyDepartment) return [user?.department].filter(Boolean);
    return [...new Set(routeList.map((entry) => entry.department).filter(Boolean))].sort();
  }, [canPickAnyDepartment, routeList, user]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    worker_id: "",
    department_name: canPickAnyDepartment ? "" : user?.department ?? "",
    start_date: asDate(new Date().toISOString()),
    required_duration_days: 180,
  });

  const { data: trainingData } = useQuery({
    queryKey: ["hub-training", id],
    queryFn: () => fetchTraining(id),
  });
  const detail = unwrapTrainingDetail(trainingData);
  const training = detail?.training;
  const participation = detail?.participation ?? [];

  const { data: sessionsData } = useQuery({
    queryKey: ["hub-training-sessions", id],
    queryFn: () => fetchSessions(id),
  });
  const sessions = unwrapData(sessionsData) ?? [];

  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["hub-training-dept-assignments", id],
    queryFn: () => fetchDeptAssignments(id),
  });
  const assignments = unwrapData(assignmentsData) ?? detail?.departmentAssignments ?? [];

  // Roster for the worker picker, so a leader is not typing raw IDs.
  const { data: workersData } = useQuery({
    queryKey: ["hub-workers-directory", form.department_name],
    queryFn: () =>
      hubGet("/workers", {
        department: form.department_name,
        activeDate: getNextSunday(),
        isAdmin: false,
      }),
    enabled: showForm && Boolean(form.department_name),
  });
  const workers = unwrapData(workersData) ?? [];

  const rows = useMemo(
    () =>
      assignments.map((assignment) => {
        const workerId = workerIdOf(assignment);
        const served = daysServed(assignment.start_date);
        const required = Number(assignment.required_duration_days ?? 0);
        const servicePct = required ? Math.min(100, Math.round((served / required) * 100)) : 0;
        const progress = completionFor(workerId, sessions, participation);
        const participationPct = progress.total > 0 ? progress.percent : 0;
        const eligible =
          required > 0 && served >= required && participationPct >= PARTICIPATION_THRESHOLD;
        return { assignment, workerId, served, required, servicePct, participationPct, eligible };
      }),
    [assignments, sessions, participation]
  );

  const eligibleCount = rows.filter((row) => row.eligible).length;
  const activeCount = assignments.filter(
    (a) => String(a.status ?? "active").toLowerCase() === "active"
  ).length;

  const createMut = useMutation({
    mutationFn: () =>
      createDeptAssignment(id, {
        worker_id: Number(form.worker_id) || form.worker_id,
        department_name: form.department_name,
        start_date: form.start_date,
        required_duration_days: Number(form.required_duration_days),
      }),
    onSuccess: () => {
      toast.success("Worker assigned");
      setForm((current) => ({ ...current, worker_id: "" }));
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["hub-training-dept-assignments", id] });
    },
    onError: (err) => toast.error(err.message || "Failed to create assignment"),
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          <Link to={`/hub/trainings/${id}`} className="text-sm text-ink-500 hover:text-ink-900">
            &larr; Back to {training?.name ?? "Training"}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow">Department Service</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">In Training</h1>
              <p className="mt-1 text-sm text-ink-500">
                Workers serving toward the next progression level
                {training ? ` after ${training.name}` : ""}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="qc-btn-primary shrink-0"
            >
              {showForm ? "Cancel" : "Assign Worker"}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="In Training" value={assignments.length} loading={isLoading} />
            <Stat label="Active" value={activeCount} loading={isLoading} />
            <Stat label="Close to Eligible" value={rows.filter((r) => !r.eligible && r.servicePct >= 80).length} loading={isLoading} />
            <Stat label="Eligible for Next Level" value={eligibleCount} loading={isLoading} />
          </div>

          {showForm && (
            <div className="qc-card p-5 space-y-4">
              <h3 className="qc-section-title">New Assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="qc-label" htmlFor="assignment-department">Department *</label>
                  <select
                    id="assignment-department"
                    className="qc-input text-sm"
                    value={form.department_name}
                    onChange={set("department_name")}
                    disabled={!canPickAnyDepartment}
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="qc-label" htmlFor="assignment-worker">Worker *</label>
                  <select
                    id="assignment-worker"
                    className="qc-input text-sm"
                    value={form.worker_id}
                    onChange={set("worker_id")}
                    disabled={!form.department_name}
                  >
                    <option value="">
                      {form.department_name ? "Select a worker" : "Pick a department first"}
                    </option>
                    {workers.map((worker) => (
                      <option key={workerIdOf(worker)} value={workerIdOf(worker)}>
                        {workerNameOf(worker)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="qc-label" htmlFor="assignment-start">Assignment start *</label>
                  <input
                    id="assignment-start"
                    type="date"
                    className="qc-input text-sm qc-num"
                    value={form.start_date}
                    onChange={set("start_date")}
                  />
                </div>
                <div>
                  <label className="qc-label" htmlFor="assignment-duration">Required service (days) *</label>
                  <input
                    id="assignment-duration"
                    type="number"
                    min="1"
                    className="qc-input text-sm qc-num"
                    value={form.required_duration_days}
                    onChange={set("required_duration_days")}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={!form.worker_id || !form.department_name || createMut.isPending}
                onClick={() => createMut.mutate()}
                className="qc-btn-primary"
              >
                {createMut.isPending ? "Saving..." : "Create Assignment"}
              </button>
            </div>
          )}

          <div className="qc-card overflow-hidden">
            <div className="hidden lg:grid grid-cols-[1.6fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-ink-200 bg-cream-200">
              <span className="qc-section-title">Worker</span>
              <span className="qc-section-title">Service progress</span>
              <span className="qc-section-title">Participation</span>
              <span className="qc-section-title">Engagement</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading assignments...</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-500">
                No workers are serving toward the next level yet.
              </div>
            ) : (
              <div className="divide-y divide-ink-200">
                {rows.map((row, index) => {
                  const { assignment, served, required, servicePct, participationPct, eligible } = row;
                  const name = workerNameOf(assignment);
                  const engagement = String(assignment.status ?? "active").toLowerCase();
                  return (
                    <div
                      key={assignment.id ?? index}
                      className="grid lg:grid-cols-[1.6fr_1fr_1fr_auto] gap-4 items-center px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-ink-200 flex items-center justify-center text-xs font-mono font-medium text-ink-700 shrink-0">
                          {initials(name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                          <div className="qc-num text-xs text-ink-400">
                            Started {formatDate(assignment.start_date)} &middot; {display(assignment.department_name ?? assignment.department)}
                          </div>
                        </div>
                        {eligible && <Tag tone="success">Eligible</Tag>}
                      </div>

                      <div className="min-w-[140px]">
                        <div className="flex justify-between mb-1">
                          <span className="qc-eyebrow text-ink-500">Days served</span>
                          <span className={`qc-num text-xs ${servicePct >= 100 ? "text-forest" : "text-ink-700"}`}>
                            {served}/{required || "-"}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${servicePct >= 100 ? "bg-forest" : "bg-mustard"}`}
                            style={{ width: `${servicePct}%` }}
                          />
                        </div>
                      </div>

                      <div className="min-w-[120px]">
                        <div className="flex justify-between mb-1">
                          <span className="qc-eyebrow text-ink-500">Participation</span>
                          <span
                            className={`qc-num text-xs ${
                              participationPct >= PARTICIPATION_THRESHOLD ? "text-forest" : "text-mustard"
                            }`}
                          >
                            {participationPct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              participationPct >= PARTICIPATION_THRESHOLD ? "bg-forest" : "bg-mustard"
                            }`}
                            style={{ width: `${participationPct}%` }}
                          />
                        </div>
                        <div className="qc-eyebrow text-ink-400 mt-1">
                          {PARTICIPATION_THRESHOLD}% required
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Tag tone={engagement === "active" ? "success" : engagement === "probation" ? "warning" : "danger"}>
                          {assignment.status ?? "active"}
                        </Tag>
                      </div>

                      {assignment.notes && (
                        <p className="lg:col-span-4 text-xs text-ink-500 border-t border-ink-100 pt-2">
                          {assignment.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-ink-500">
            A worker unlocks the next level once they have completed this training, served the
            required time, and held at least {PARTICIPATION_THRESHOLD}% participation.
          </p>
        </div>
      </Layout>
    </>
  );
}
