import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { useEffectiveRouteList } from "../../../contexts/DepartmentsContext";
import { getUserRole } from "../../../utils/getUserRole";
import { getNextSunday } from "../../../utils/getDate";
import {
  fetchTraining,
  fetchNominations,
  nominateWorkers,
} from "../../../services/hub/trainings";
import { hubGet } from "../../../services/hub/client";
import {
  formatDate,
  initials,
  unwrapData,
  unwrapTrainingDetail,
  workerIdOf,
  workerNameOf,
} from "../../../utils/training";

/** FE-T4 — a nomination lives through four states after it is sent. */
const NOMINATION_TONE = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  expired: "neutral",
};

export default function NominateWorkers() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const canNominate = useCanAction("nominate_workers");
  const { isSuperAdmin, isChurchAdmin, isAdmin, user } = getUserRole();
  const routeList = useEffectiveRouteList();

  const canPickAnyDepartment = isSuperAdmin || isChurchAdmin || isAdmin;
  const departments = useMemo(() => {
    if (!canPickAnyDepartment) return [user?.department].filter(Boolean);
    return [...new Set(routeList.map((entry) => entry.department).filter(Boolean))].sort();
  }, [canPickAnyDepartment, routeList, user]);

  const [department, setDepartment] = useState(
    canPickAnyDepartment ? "" : user?.department ?? ""
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [expiresInDays, setExpiresInDays] = useState("");

  const { data: trainingData } = useQuery({
    queryKey: ["hub-training", id],
    queryFn: () => fetchTraining(id),
  });
  const training = unwrapTrainingDetail(trainingData)?.training;

  // The roster endpoint is department-scoped and needs an attendance date.
  const { data: workersData, isLoading: workersLoading } = useQuery({
    queryKey: ["hub-workers-directory", department],
    queryFn: () =>
      hubGet("/workers", {
        department,
        activeDate: getNextSunday(),
        isAdmin: false,
      }),
    enabled: Boolean(department),
  });
  const workers = unwrapData(workersData) ?? [];

  const { data: nominationsData } = useQuery({
    queryKey: ["hub-training-nominations", id],
    queryFn: () => fetchNominations(id),
  });
  const nominations = unwrapData(nominationsData) ?? [];
  const nominatedIds = useMemo(
    () => new Map(nominations.map((n) => [String(workerIdOf(n)), n])),
    [nominations]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return workers;
    return workers.filter((w) =>
      `${workerNameOf(w)} ${w.department ?? ""}`.toLowerCase().includes(term)
    );
  }, [workers, search]);

  const mutation = useMutation({
    mutationFn: () => {
      const workerIds = selected.map((w) => workerIdOf(w));
      const days = expiresInDays ? Number(expiresInDays) : undefined;
      return nominateWorkers(id, workerIds, days);
    },
    onSuccess: (res) => {
      const results = unwrapData(res) ?? [];
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.length - succeeded;
      toast.success(`${succeeded} worker${succeeded !== 1 ? "s" : ""} nominated`);
      if (failed > 0) toast.warn(`${failed} could not be nominated`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["hub-training-nominations", id] });
    },
    onError: (err) => toast.error(err.message || "Failed to nominate workers"),
  });

  const toggleWorker = (worker) => {
    const workerId = workerIdOf(worker);
    setSelected((prev) =>
      prev.some((w) => workerIdOf(w) === workerId)
        ? prev.filter((w) => workerIdOf(w) !== workerId)
        : [...prev, worker]
    );
  };

  const isSelected = (worker) => selected.some((w) => workerIdOf(w) === workerIdOf(worker));

  if (!canNominate) {
    return (
      <>
        <Header />
        <Layout>
          <div className="max-w-lg mx-auto qc-card p-8 text-center text-ink-500">
            You do not have permission to nominate workers.
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Header />
      <Layout>
        <div className="max-w-3xl space-y-6">
          <Link to={`/hub/trainings/${id}`} className="text-sm text-ink-500 hover:text-ink-900">
            &larr; Back to {training?.name ?? "Training"}
          </Link>

          <div>
            <div className="qc-eyebrow">Nomination</div>
            <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">Nominate Workers</h1>
            {training && (
              <p className="mt-1 text-sm text-ink-500">
                for <span className="font-medium text-ink-700">{training.name}</span>
              </p>
            )}
          </div>

          <div className="qc-card p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="qc-label" htmlFor="nominate-department">Department *</label>
                <select
                  id="nominate-department"
                  value={department}
                  onChange={(e) => { setDepartment(e.target.value); setSelected([]); }}
                  className="qc-input text-sm"
                  disabled={!canPickAnyDepartment}
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="qc-label" htmlFor="nominate-search">Filter workers</label>
                <input
                  id="nominate-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or department..."
                  className="qc-input text-sm"
                />
              </div>
            </div>

            {!department ? (
              <div className="rounded border border-ink-200 p-6 text-center text-sm text-ink-500">
                Choose a department to load its workers.
              </div>
            ) : workersLoading ? (
              <div className="rounded border border-ink-200 p-6 text-center text-sm text-ink-500">
                Loading workers...
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded border border-ink-200 p-6 text-center text-sm text-ink-500">
                No workers match this filter.
              </div>
            ) : (
              <div className="border border-ink-200 rounded-md divide-y divide-ink-200 max-h-72 overflow-y-auto bg-white">
                {filtered.map((worker) => {
                  const workerId = workerIdOf(worker);
                  const name = workerNameOf(worker);
                  const existing = nominatedIds.get(String(workerId));
                  const checked = isSelected(worker);
                  return (
                    <label
                      key={workerId}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        existing
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer hover:bg-cream-200"
                      } ${checked ? "bg-cream-200" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={Boolean(existing)}
                        onChange={() => toggleWorker(worker)}
                        className="h-4 w-4 rounded border-ink-300 accent-ink-900"
                      />
                      <div className="w-7 h-7 rounded-full bg-ink-200 flex items-center justify-center text-xs font-mono text-ink-700 shrink-0">
                        {initials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                        <div className="qc-eyebrow text-ink-400">{worker.department}</div>
                      </div>
                      {existing && (
                        <Tag tone={NOMINATION_TONE[String(existing.status).toLowerCase()] ?? "neutral"}>
                          {existing.status}
                        </Tag>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="qc-label" htmlFor="nominate-expiry">Nomination expiry (optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    id="nominate-expiry"
                    type="number"
                    min={1}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="Days"
                    className="qc-input text-sm qc-num w-24"
                  />
                  <span className="text-sm text-ink-500">days</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-ink-500">
                  <span className="qc-num">{selected.length}</span> selected
                </span>
                <button
                  type="button"
                  disabled={selected.length === 0 || mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="qc-btn-primary"
                >
                  {mutation.isPending ? "Nominating..." : "Send Nominations"}
                </button>
              </div>
            </div>
          </div>

          {/* Status per worker, not just at the moment of sending */}
          <div>
            <div className="qc-section-title mb-3">Nomination status</div>
            <div className="qc-card overflow-hidden">
              {nominations.length === 0 ? (
                <div className="p-8 text-center text-sm text-ink-500">
                  No nominations sent for this training yet.
                </div>
              ) : (
                <div className="divide-y divide-ink-200">
                  {nominations.map((nomination, index) => {
                    const name = workerNameOf(nomination);
                    return (
                      <div key={nomination.id ?? index} className="flex items-center gap-4 px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-ink-200 flex items-center justify-center text-xs font-mono text-ink-700 shrink-0">
                          {initials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                          <div className="qc-num text-xs text-ink-400">
                            {nomination.expires_at
                              ? `Expires ${formatDate(nomination.expires_at)}`
                              : `Nominated ${formatDate(nomination.createdat ?? nomination.created_at)}`}
                          </div>
                        </div>
                        <Tag tone={NOMINATION_TONE[String(nomination.status).toLowerCase()] ?? "neutral"}>
                          {nomination.status}
                        </Tag>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
