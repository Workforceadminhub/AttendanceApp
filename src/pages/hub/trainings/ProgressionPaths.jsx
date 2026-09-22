import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Tag } from "../../../components/ui";
import {
  createProgressionPath,
  deleteProgressionPath,
  fetchProgressionPaths,
  fetchAllTrainings,
  updateProgressionPath,
  updateProgressionPathSteps,
} from "../../../services/hub/trainings";
import { unwrapData } from "../../../utils/training";
import { buildPathwayChain } from "./TrainingClassification";

/**
 * Progression pathways - the ordered chains that progressive trainings sit on.
 *
 * A pathway is created here; a training joins one (and takes its position in the
 * chain) on the Create/Edit Training form, which is where the classification
 * decision belongs. This screen is the read-across: it shows every chain end to
 * end so an admin can see the whole ladder at once.
 */
export default function ProgressionPaths() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", stepIds: [] });
  const [editingId, setEditingId] = useState(null);

  const { data: pathsData, isLoading } = useQuery({
    queryKey: ["hub-progression-paths"],
    queryFn: fetchProgressionPaths,
  });
  const paths = useMemo(() => unwrapData(pathsData) ?? [], [pathsData]);

  const { data: trainingsData } = useQuery({
    queryKey: ["hub-trainings", "all-for-pathway"],
    queryFn: () => fetchAllTrainings(),
  });
  const trainings = useMemo(() => trainingsData?.data ?? [], [trainingsData]);

  const chains = useMemo(
    () =>
      paths.map((path) => ({
        path,
        chain: (() => {
          const apiSteps = path.steps ?? path.levels ?? [];
          if (!Array.isArray(apiSteps) || apiSteps.length === 0) {
            return buildPathwayChain(trainings, { pathId: path.id });
          }
          return apiSteps
            .map((step) => {
              const trainingId =
                step.training_program_id ??
                step.training_id ??
                step.training_program?.id ??
                step.training?.id;
              return (
                step.training_program ??
                step.training ??
                trainings.find((training) => String(training.id) === String(trainingId))
              );
            })
            .filter(Boolean);
        })(),
      })),
    [paths, trainings]
  );

  const createMut = useMutation({
    mutationFn: (payload) => createProgressionPath(payload),
    onSuccess: () => {
      toast.success("Progression pathway created");
      queryClient.invalidateQueries({ queryKey: ["hub-progression-paths"] });
      setForm({ name: "", description: "", stepIds: [] });
      setAdding(false);
    },
    onError: (err) => toast.error(err.message || "Failed to create pathway"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, payload, steps }) => {
      await updateProgressionPath(id, payload);
      return updateProgressionPathSteps(id, steps);
    },
    onSuccess: () => {
      toast.success("Progression pathway updated");
      queryClient.invalidateQueries({ queryKey: ["hub-progression-paths"] });
      setForm({ name: "", description: "", stepIds: [] });
      setEditingId(null);
      setAdding(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update pathway"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProgressionPath,
    onSuccess: () => {
      toast.success("Progression pathway deleted");
      queryClient.invalidateQueries({ queryKey: ["hub-progression-paths"] });
    },
    onError: (err) => toast.error(err.message || "Failed to delete pathway"),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Pathway name is required");
      return;
    }
    const steps = form.stepIds.map((trainingProgramId) => ({
      training_program_id: trainingProgramId,
    }));
    const payload = { name: form.name.trim(), steps };
    if (form.description.trim()) payload.description = form.description.trim();
    if (editingId) {
      const { steps: ignoredSteps, ...metadata } = payload;
      void ignoredSteps;
      updateMut.mutate({ id: editingId, payload: metadata, steps });
    }
    else createMut.mutate(payload);
  };

  const beginEdit = (path) => {
    const apiSteps = path.steps ?? path.levels ?? [];
    const fallbackSteps = buildPathwayChain(trainings, { pathId: path.id });
    const stepIds = (apiSteps.length > 0 ? apiSteps : fallbackSteps)
      .map((step) =>
        step.training_program_id ??
        step.training_id ??
        step.training_program?.id ??
        step.training?.id ??
        step.id
      )
      .filter((trainingId) => trainingId != null)
      .map(String);
    setEditingId(path.id);
    setForm({ name: path.name ?? "", description: path.description ?? "", stepIds });
    setAdding(true);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingId(null);
    setForm({ name: "", description: "", stepIds: [] });
  };

  const addStep = (trainingId) => {
    if (!trainingId || form.stepIds.includes(String(trainingId))) return;
    setForm((current) => ({ ...current, stepIds: [...current.stepIds, String(trainingId)] }));
  };

  const moveStep = (index, offset) => {
    setForm((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.stepIds.length) return current;
      const stepIds = [...current.stepIds];
      [stepIds[index], stepIds[target]] = [stepIds[target], stepIds[index]];
      return { ...current, stepIds };
    });
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
        <button type="button" onClick={adding ? cancelForm : () => setAdding(true)} className="qc-btn-secondary">
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
          <div>
            <label className="qc-label" htmlFor="pathway-level">Levels</label>
            <p className="mb-2 text-xs text-ink-500">
              Add existing trainings in the order workers must complete them.
            </p>
            <select
              id="pathway-level"
              className="qc-input text-sm"
              value=""
              onChange={(event) => addStep(event.target.value)}
            >
              <option value="">Add a training as a level...</option>
              {trainings
                .filter((training) => !form.stepIds.includes(String(training.id)))
                .map((training) => (
                  <option key={training.id} value={training.id}>{training.name}</option>
                ))}
            </select>
            {form.stepIds.length > 0 && (
              <ol className="mt-3 rounded border border-ink-200 divide-y divide-ink-200">
                {form.stepIds.map((trainingId, index) => {
                  const training = trainings.find((item) => String(item.id) === String(trainingId));
                  return (
                    <li key={trainingId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <span className="qc-num text-xs text-ink-500">{index + 1}</span>
                      <span className="flex-1 min-w-0 truncate text-sm text-ink-900">
                        {training?.name ?? `Training ${trainingId}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => moveStep(index, -1)}
                        disabled={index === 0}
                        className="qc-btn-ghost px-2"
                        aria-label={`Move ${training?.name ?? "level"} up`}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, 1)}
                        disabled={index === form.stepIds.length - 1}
                        className="qc-btn-ghost px-2"
                        aria-label={`Move ${training?.name ?? "level"} down`}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({
                          ...current,
                          stepIds: current.stepIds.filter((id) => id !== trainingId),
                        }))}
                        className="text-xs font-medium text-brick hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="qc-btn-primary">
            {createMut.isPending || updateMut.isPending
              ? "Saving..."
              : editingId
              ? "Save Pathway"
              : "Create Pathway"}
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
              <div className="mt-4 flex gap-3 text-xs">
                <button type="button" onClick={() => beginEdit(path)} className="font-medium text-ink-700 hover:text-ink-900 underline underline-offset-2">
                  Edit pathway
                </button>
                <button
                  type="button"
                  disabled={deleteMut.isPending || chain.length > 0}
                  onClick={() => {
                    if (window.confirm(`Delete ${path.name}?`)) deleteMut.mutate(path.id);
                  }}
                  className="font-medium text-brick hover:underline disabled:opacity-40"
                  title={chain.length > 0 ? "Remove or reassign its trainings before deleting this pathway" : undefined}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
