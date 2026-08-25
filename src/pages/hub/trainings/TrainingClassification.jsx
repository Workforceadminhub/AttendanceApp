import { useMemo, useState } from "react";
import { TRAINING_KIND } from "../../../utils/training";

/**
 * FE-T2 Classification — Standalone vs Progressive.
 *
 * This is deliberately the loudest block on the create/edit form: the choice
 * changes how the training behaves everywhere else (progression lock/unlock,
 * tracker visibility, eligibility rules), so it reads as a core decision rather
 * than a buried toggle.
 *
 * For a progressive training the admin sees and edits the whole ordered chain,
 * not just one prerequisite in isolation. The chain is derived by walking
 * `prerequisite_template_slug` links between the trainings that share a path.
 */

const KIND_CHOICES = [
  {
    value: TRAINING_KIND.STANDALONE,
    label: "Standalone",
    blurb: "A one-off training. No prerequisite, no pathway.",
  },
  {
    value: TRAINING_KIND.PROGRESSIVE,
    label: "Progressive",
    blurb: "Part of an ordered pathway. Workers must clear the level before it.",
  },
];

/**
 * Orders the trainings on a path into a chain by following prerequisite links.
 * Falls back to start-date order for any training the links do not reach, so a
 * partially-linked path still renders in a sensible sequence.
 */
export function buildPathwayChain(trainings, { pathId, draft } = {}) {
  const onPath = (trainings ?? []).filter(
    (t) => pathId && String(t.progression_path_id ?? "") === String(pathId)
  );

  // The draft may not be saved yet, or may have just been moved onto this path.
  const merged = [...onPath];
  if (draft) {
    const index = merged.findIndex((t) => String(t.id) === String(draft.id));
    if (index >= 0) merged[index] = { ...merged[index], ...draft };
    else merged.push(draft);
  }

  const bySlug = new Map();
  merged.forEach((t) => {
    if (t.template_slug) bySlug.set(t.template_slug, t);
  });

  const hasPredecessor = new Set();
  merged.forEach((t) => {
    if (t.prerequisite_template_slug && bySlug.has(t.prerequisite_template_slug)) {
      hasPredecessor.add(t.template_slug ?? t.id);
    }
  });

  const roots = merged.filter((t) => !hasPredecessor.has(t.template_slug ?? t.id));
  const successorOf = new Map();
  merged.forEach((t) => {
    const prereq = t.prerequisite_template_slug;
    if (prereq && bySlug.has(prereq)) successorOf.set(prereq, t);
  });

  const chain = [];
  const seen = new Set();
  const walk = (node) => {
    let current = node;
    while (current && !seen.has(current.id ?? current.template_slug)) {
      seen.add(current.id ?? current.template_slug);
      chain.push(current);
      current = successorOf.get(current.template_slug);
    }
  };

  roots
    .slice()
    .sort((a, b) => String(a.start_date ?? "").localeCompare(String(b.start_date ?? "")))
    .forEach(walk);

  // Anything left over (cycles, orphans) still deserves a place in the list.
  merged.forEach((t) => {
    if (!seen.has(t.id ?? t.template_slug)) chain.push(t);
  });

  return chain;
}

export default function TrainingClassification({
  kind,
  onKindChange,
  pathId,
  onPathChange,
  prerequisiteSlug,
  onPrerequisiteChange,
  paths,
  pathsLoading,
  trainings,
  draft,
  error,
  onCreatePathway,
  creatingPathway = false,
}) {
  const isProgressive = kind === TRAINING_KIND.PROGRESSIVE;
  const [newPathName, setNewPathName] = useState("");
  const [showNewPath, setShowNewPath] = useState(false);

  const chain = useMemo(
    () => (isProgressive ? buildPathwayChain(trainings, { pathId, draft }) : []),
    [isProgressive, trainings, pathId, draft]
  );

  const draftId = draft?.id ?? "__draft__";
  const draftPosition = chain.findIndex(
    (step) => String(step.id ?? "__draft__") === String(draftId)
  );

  /**
   * Repositioning this training in the chain is expressed as "which level comes
   * before me", which is exactly what the API stores.
   */
  const moveTo = (targetIndex) => {
    const others = chain.filter((step) => String(step.id ?? "__draft__") !== String(draftId));
    const clamped = Math.max(0, Math.min(targetIndex, others.length));
    const predecessor = clamped === 0 ? null : others[clamped - 1];
    onPrerequisiteChange(predecessor?.template_slug ?? "");
  };

  const prerequisiteOptions = (trainings ?? []).filter(
    (t) =>
      t.template_slug &&
      String(t.id) !== String(draft?.id) &&
      (!pathId || String(t.progression_path_id ?? "") === String(pathId))
  );

  return (
    <div className="rounded-md border border-ink-200 bg-white p-4 space-y-4">
      <div>
        <span className="qc-label">Training type *</span>
        <p className="text-xs text-ink-500 mb-3">
          This determines how the training behaves everywhere: progression locks, tracker
          visibility, and eligibility rules all depend on this choice.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {KIND_CHOICES.map((choice) => {
            const selected = kind === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onKindChange(choice.value)}
                className={`p-3 rounded border text-left transition-colors ${
                  selected
                    ? "border-ink-900 bg-ink-900 text-cream"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-cream-200"
                }`}
              >
                <div className="text-sm font-medium">{choice.label}</div>
                <div className={`text-xs mt-0.5 ${selected ? "text-ink-300" : "text-ink-400"}`}>
                  {choice.blurb}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isProgressive && (
        <>
          <div>
            <label className="qc-label" htmlFor="progression-path">
              Progression pathway *
            </label>
            <select
              id="progression-path"
              className={`qc-input text-sm ${error ? "border-brick" : ""}`}
              value={pathId ?? ""}
              onChange={(event) => onPathChange(event.target.value)}
            >
              <option value="">Select a pathway</option>
              {(paths ?? []).map((path) => (
                <option key={path.id} value={path.id}>
                  {path.name}
                </option>
              ))}
            </select>
            {pathsLoading && (
              <span className="text-xs text-ink-400 mt-1 block">Loading pathways...</span>
            )}
            {!pathsLoading && (paths ?? []).length === 0 && (
              <span className="text-xs text-ink-500 mt-1 block">
                No pathways yet. Create one below without leaving this training.
              </span>
            )}
            {error && <span className="text-xs text-brick mt-1 block">{error}</span>}
            {onCreatePathway && (
              <div className="mt-2">
                {!showNewPath ? (
                  <button type="button" onClick={() => setShowNewPath(true)} className="text-xs font-medium text-forest hover:underline">
                    + Add a new pathway
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 rounded border border-ink-200 bg-cream-50 p-3">
                    <input
                      className="qc-input text-sm flex-1"
                      value={newPathName}
                      onChange={(event) => setNewPathName(event.target.value)}
                      placeholder="e.g. Foundation to Leadership Pathway"
                      aria-label="New pathway name"
                    />
                    <button
                      type="button"
                      disabled={!newPathName.trim() || creatingPathway}
                      onClick={() => {
                        onCreatePathway({ name: newPathName.trim() });
                        setNewPathName("");
                        setShowNewPath(false);
                      }}
                      className="qc-btn-secondary whitespace-nowrap"
                    >
                      {creatingPathway ? "Creating..." : "Create pathway"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {pathId && (
            <div>
              <span className="qc-label">Pathway order</span>
              <p className="text-xs text-ink-500 mb-2">
                Workers move down this chain one level at a time. Use the arrows to move this
                training within it.
              </p>
              <ol className="rounded border border-ink-200 divide-y divide-ink-200">
                {chain.map((step, index) => {
                  const isDraft = String(step.id ?? "__draft__") === String(draftId);
                  return (
                    <li
                      key={step.id ?? "__draft__"}
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        isDraft ? "bg-cream-200" : "bg-white"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center qc-num text-xs shrink-0 ${
                          isDraft ? "bg-ink-900 text-cream" : "bg-ink-200 text-ink-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`flex-1 min-w-0 truncate text-sm ${
                          isDraft ? "font-medium text-ink-900" : "text-ink-700"
                        }`}
                      >
                        {step.name || "This training"}
                      </span>
                      {isDraft ? (
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="qc-eyebrow text-sienna mr-1">this training</span>
                          <button
                            type="button"
                            aria-label="Move earlier in pathway"
                            disabled={draftPosition <= 0}
                            onClick={() => moveTo(draftPosition - 1)}
                            className="w-6 h-6 rounded border border-ink-200 bg-white text-ink-700 hover:bg-cream-200 disabled:opacity-40"
                          >
                            &uarr;
                          </button>
                          <button
                            type="button"
                            aria-label="Move later in pathway"
                            disabled={draftPosition >= chain.length - 1}
                            onClick={() => moveTo(draftPosition + 1)}
                            className="w-6 h-6 rounded border border-ink-200 bg-white text-ink-700 hover:bg-cream-200 disabled:opacity-40"
                          >
                            &darr;
                          </button>
                        </span>
                      ) : (
                        <span className="qc-eyebrow text-ink-400 shrink-0 capitalize">
                          {step.status ?? "-"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div>
            <label className="qc-label" htmlFor="prerequisite-training">
              Prerequisite training
            </label>
            <select
              id="prerequisite-training"
              className="qc-input text-sm"
              value={prerequisiteSlug ?? ""}
              onChange={(event) => onPrerequisiteChange(event.target.value)}
            >
              <option value="">None - first level in the pathway</option>
              {prerequisiteOptions.map((t) => (
                <option key={t.id} value={t.template_slug}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-500 mt-1">
              A worker cannot enrol here until they have completed this level, served the
              required time, and met the participation threshold.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
