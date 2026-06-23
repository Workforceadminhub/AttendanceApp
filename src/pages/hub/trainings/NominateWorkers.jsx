import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { fetchTraining, nominateWorkers } from "../../../services/hub/trainings";
import { hubGet } from "../../../services/hub/client";

export default function NominateWorkers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canNominate = useCanAction("nominate_workers");

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [expiresInDays, setExpiresInDays] = useState("");

  const { data: trainingData } = useQuery({
    queryKey: ["hub-training", id],
    queryFn: () => fetchTraining(id),
  });
  const training = trainingData?.data ?? trainingData;

  const { data: workersData, isLoading: workersLoading } = useQuery({
    queryKey: ["hub-workers-directory", search],
    queryFn: () => hubGet("/workers", { search, per_page: 50 }),
    enabled: search.length >= 2,
  });
  const workers = workersData?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      const workerIds = selected.map((w) => w.id ?? w.worker_id ?? w.workerId);
      const days = expiresInDays ? Number(expiresInDays) : undefined;
      return nominateWorkers(id, workerIds, days);
    },
    onSuccess: (res) => {
      const results = res?.data ?? [];
      const succeeded = results.filter((r) => r.success).length;
      toast.success(`${succeeded} worker${succeeded !== 1 ? "s" : ""} nominated`);
      queryClient.invalidateQueries({ queryKey: ["hub-training-nominations", id] });
      navigate(`/hub/trainings/${id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to nominate workers");
    },
  });

  const toggleWorker = (worker) => {
    const workerId = worker.id ?? worker.worker_id ?? worker.workerId;
    setSelected((prev) => {
      const exists = prev.find(
        (w) => (w.id ?? w.worker_id ?? w.workerId) === workerId
      );
      if (exists) return prev.filter((w) => (w.id ?? w.worker_id ?? w.workerId) !== workerId);
      return [...prev, worker];
    });
  };

  const isSelected = (worker) => {
    const workerId = worker.id ?? worker.worker_id ?? worker.workerId;
    return selected.some((w) => (w.id ?? w.worker_id ?? w.workerId) === workerId);
  };

  if (!canNominate) {
    return (
      <>
        <Header />
        <Layout>
          <div className="p-8 text-center text-ink-500">
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
        <div className="max-w-2xl space-y-6">
          <Link to={`/hub/trainings/${id}`} className="text-sm text-ink-500 hover:text-ink-900">
            &larr; Back to {training?.name ?? "Training"}
          </Link>

          <div>
            <div className="qc-eyebrow">Nomination</div>
            <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
              Nominate Workers
            </h1>
            {training && (
              <p className="mt-1 text-sm text-ink-500">
                for <span className="font-medium text-ink-700">{training.name}</span>
              </p>
            )}
          </div>

          {/* Search workers */}
          <div>
            <label className="qc-label">Search workers</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type at least 2 characters to search..."
              className="qc-input"
            />
          </div>

          {/* Search results */}
          {search.length >= 2 && (
            <div className="qc-card overflow-hidden">
              {workersLoading ? (
                <div className="p-4 text-sm text-ink-500">Searching...</div>
              ) : workers.length === 0 ? (
                <div className="p-4 text-sm text-ink-500">No workers found.</div>
              ) : (
                <div className="divide-y divide-ink-100 max-h-64 overflow-y-auto">
                  {workers.map((w) => {
                    const workerId = w.id ?? w.worker_id ?? w.workerId;
                    const name = w.fullname ?? (`${w.firstname ?? ""} ${w.lastname ?? ""}`.trim() || w.name || `Worker ${workerId}`);
                    const checked = isSelected(w);
                    return (
                      <label
                        key={workerId}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-cream-200 transition-colors ${
                          checked ? "bg-cream-200" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWorker(w)}
                          className="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-ink-900/10"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                          {w.department && (
                            <div className="text-xs text-ink-500">{w.department}</div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Selected workers */}
          {selected.length > 0 && (
            <div>
              <label className="qc-label">
                Selected ({selected.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selected.map((w) => {
                  const workerId = w.id ?? w.worker_id ?? w.workerId;
                  const name = w.fullname ?? (`${w.firstname ?? ""} ${w.lastname ?? ""}`.trim() || `Worker ${workerId}`);
                  return (
                    <Tag key={workerId} tone="info">
                      {name}
                      <button
                        type="button"
                        onClick={() => toggleWorker(w)}
                        className="ml-1 text-ink-500 hover:text-ink-900"
                        aria-label={`Remove ${name}`}
                      >
                        &times;
                      </button>
                    </Tag>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expiry */}
          <div>
            <label className="qc-label">Nomination expiry (optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Days"
                className="qc-input qc-num w-24"
              />
              <span className="text-sm text-ink-500">days</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={selected.length === 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="qc-btn-primary"
            >
              {mutation.isPending
                ? "Nominating..."
                : `Nominate ${selected.length} Worker${selected.length !== 1 ? "s" : ""}`}
            </button>
            <Link to={`/hub/trainings/${id}`} className="qc-btn-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
}
