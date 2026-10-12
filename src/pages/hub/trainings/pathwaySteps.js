import { buildPathwayChain } from "./TrainingClassification";

// A stored step's id identifies the step, not necessarily its training. Only
// explicit training references are safe to send to the steps update endpoint.
export function normalizePathwaySteps(path, trainings = []) {
  const stored = path.steps ?? path.levels;
  const hasStoredSteps = Array.isArray(stored) && stored.length > 0;
  const steps = hasStoredSteps ? stored : buildPathwayChain(trainings, { pathId: path.id });
  return steps.map((step, index) => {
    const embedded = step.training_program ?? step.training;
    const reference = hasStoredSteps
      ? step.training_program_id ?? step.training_id ?? embedded?.id
      : step.id;
    const trainingId = reference == null ? null : String(reference);
    const training = embedded ?? trainings.find((item) => trainingId != null && String(item.id) === trainingId);
    return {
      key: `level-${index}-${step.id ?? trainingId ?? "unknown"}`,
      trainingId,
      name: training?.name ?? (trainingId == null ? "Unavailable training (reference missing)" : `Unavailable training (${trainingId})`),
      status: training?.status,
    };
  });
}
