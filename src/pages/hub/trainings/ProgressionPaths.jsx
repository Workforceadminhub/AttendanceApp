import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Tag } from "../../../components/ui";
import {
  createProgressionPath,
  fetchProgressionPaths,
  fetchTrainings,
} from "../../../services/hub/trainings";
import { unwrapData } from "../../../utils/training";
import { buildPathwayChain } from "./TrainingClassification";

/**
 * Progression pathways — the ordered chains that progressive trainings sit on.
 *
 * A pathway is created here; a training joins one (and takes its position in the
 * chain) on the Create/Edit Training form, which is where the classification
 * decision belongs. This screen is the read-across: it shows every chain end to
 * end so an admin can see the whole ladder at once.
 */
export default function ProgressionPaths() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: pathsData, isLoading } = useQuery({
    queryKey: ["hub-progression-paths"],
    queryFn: fetchProgressionPaths,
  });
  const paths = unwrapData(pathsData) ?? [];

  const { data: trainingsData } = useQuery({
    queryKey: ["hub-trainings", "all-for-pathway"],
    queryFn: () => fetchTrainings({ per_page: 100 }),
  });
  const trainings = trainingsData?.data ?? [];

  const chains = useMemo(
    () =>
      paths.map((path) => ({
        path,
        chain: buildPathwayChain(trainings, { pathId: path.id }),
      })),
    [paths, trainings]
  );

  const createMut = useMutation({
    mutationFn: (payload) => createProgressionPath(payload),
    onSuccess: () => {
      toast.success("Progression pathway created");
      queryClient.invalidateQueries({ queryKey: ["hub-progression-paths"] });
      setForm({ name: "", description: "" });
      setAdding(false);
    },
    onError: (err) => toast.error(err.message || "Failed to create pathway"),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Pathway name is required");
      return;
    }
    const payload = { name: form.name.trim() };
    if (form.description.trim()) payload.description = form.description.trim();
    createMut.mutate(payload);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium text-ink-900 tracking-tight">Progression Pathways</h2>
          <p className="mt-1 text-sm text-ink-500">
            Ordered ladders a worker climbs one level at a time. Assign a training to a pathway
            from its Classification section.
          </p>
        </div>
        <button type="button" onClick={() => setAdding((current) => !current)} className="qc-btn-secondary">
          {adding ? "Cancel" : "+ New Pathway"}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleSubmit} className="qc-card p-5 space-y-4">
          <div>
            <label className="qc-label" htmlFor="pathway-name">Pathway name *</label>
            <input
              id="pathway-name"
              autoFocus
              className="qc-input text-sm"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Leadership Track"
              required
            />
          </div>
          <div>
            <label className="qc-label" htmlFor="pathway-description">Description</label>
            <input
              id="pathway-description"
              className="qc-input text-sm"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="What this ladder leads to"
            />
          </div>
          <button type="submit" disabled={createMut.isPending} className="qc-btn-primary">
            {createMut.isPending ? "Saving..." : "Create Pathway"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="qc-card p-8 text-center text-ink-500">Loading pathways...</div>
      ) : chains.length === 0 ? (
        <div className="qc-card p-8 text-center text-sm text-ink-500">
          No progression pathways yet. Create one to start building an ordered chain.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {chains.map(({ path, chain }) => (
            <div key={path.id} className="qc-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink-900 truncate">{path.name}</h3>
                  {path.description && (
                    <p className="text-xs text-ink-500 mt-0.5">{path.description}</p>
                  )}
                </div>
                <Tag tone="neutral">
                  {chain.length} level{chain.length === 1 ? "" : "s"}
                </Tag>
              </div>

              {chain.length === 0 ? (
                <p className="mt-4 text-sm text-ink-400">
                  No trainings on this pathway yet.
                </p>
              ) : (
                <ol className="mt-4 space-y-2">
                  {chain.map((step, index) => (
                    <li key={step.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-ink-200 text-ink-700 flex items-center justify-center qc-num text-xs shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-sm text-ink-900">{step.name}</span>
                      <span className="qc-eyebrow text-ink-400 shrink-0 capitalize">{step.status ?? "-"}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
