import { Tag } from "../../ui";
import {
  PROGRESSION_STATE,
  PROGRESSION_STATE_LABEL,
  PROGRESSION_STATE_TONE,
  completionFor,
  progressTone,
  resolveProgressionStates,
} from "../../../utils/training";

/**
 * FE-T10 Progression tracker.
 *
 * Shows where a worker stands on an ordered pathway across the five states the
 * spec defines: not started, in progress, completed - serving, eligible for the
 * next level, and pathway complete.
 *
 * `chain` is the ordered list of trainings on the pathway (see
 * `buildPathwayChain`). When `workerId` is omitted the tracker renders the
 * pathway itself without a personal position, which is what an admin sees.
 */
export default function ProgressionTracker({
  chain = [],
  currentTrainingId,
  sessions = [],
  participation = [],
  workerTrainings = [],
  workerId = null,
  assignment = null,
  isCurrentEnrolled = false,
}) {
  if (chain.length === 0) return null;

  const states = resolveProgressionStates({
    chain,
    currentTrainingId,
    sessions,
    participation,
    workerTrainings,
    workerId,
    assignment,
    isCurrentEnrolled,
  });

  // The furthest level the worker has actually reached.
  const activeIndex = states.reduce(
    (found, state, index) => (state === PROGRESSION_STATE.NOT_STARTED ? found : index),
    -1
  );

  return (
    <div className="qc-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-ink-900">Progression pathway</h3>
        {workerId && activeIndex >= 0 && (
          <span className="qc-eyebrow text-ink-500">
            Level {activeIndex + 1} of {chain.length}
          </span>
        )}
      </div>

      <div className="relative">
        {/* Connector line behind the nodes */}
        <div className="absolute left-4 top-4 bottom-4 w-px bg-ink-200" aria-hidden="true" />

        <ol className="space-y-0">
          {chain.map((step, index) => {
            const state = states[index];
            const isCurrent = String(step.id) === String(currentTrainingId);
            const isLocked = state === PROGRESSION_STATE.NOT_STARTED && index > activeIndex;
            const progress = workerId
              ? completionFor(workerId, isCurrent ? sessions : [], participation)
              : null;

            return (
              <li key={step.id} className="relative flex gap-4 items-start pb-6 last:pb-0">
                <Node state={state} index={index} isLocked={isLocked} />

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium ${isLocked ? "text-ink-400" : "text-ink-900"}`}
                    >
                      {step.name}
                    </span>
                    {isCurrent && <span className="qc-live-dot" aria-hidden="true" />}
                  </div>

                  <div className="mt-1">
                    <Tag tone={isLocked ? "neutral" : PROGRESSION_STATE_TONE[state]}>
                      {PROGRESSION_STATE_LABEL[state]}
                    </Tag>
                  </div>

                  {isCurrent && progress?.total > 0 && (
                    <div className="mt-2 max-w-xs">
                      <div className="flex justify-between mb-1">
                        <span className="qc-eyebrow text-ink-500">Attendance</span>
                        <span className="qc-num text-xs text-ink-700">
                          {progress.present}/{progress.total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${progressTone(progress.percent).bar}`}
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {state === PROGRESSION_STATE.COMPLETED_SERVING && assignment && (
                    <ServiceProgress assignment={assignment} />
                  )}

                  {isLocked && (
                    <p className="mt-1 text-xs text-ink-400">
                      Complete {chain[index - 1]?.name ?? "the previous level"}, serve the required
                      time, and meet the participation threshold to unlock.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Node({ state, index, isLocked }) {
  const done =
    state === PROGRESSION_STATE.COMPLETE ||
    state === PROGRESSION_STATE.ELIGIBLE;
  const active =
    state === PROGRESSION_STATE.IN_PROGRESS ||
    state === PROGRESSION_STATE.COMPLETED_SERVING;

  return (
    <div
      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
        done
          ? "bg-forest border-forest"
          : active
          ? "bg-ink-900 border-ink-900"
          : isLocked
          ? "bg-cream border-ink-200"
          : "bg-white border-ink-300"
      }`}
    >
      {done ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2.5 7l3.5 3.5 5.5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : isLocked ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <rect x="2" y="5" width="8" height="6" rx="1" stroke="#C7C7C2" strokeWidth="1.2" />
          <path d="M4 5V4a2 2 0 114 0v1" stroke="#C7C7C2" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ) : (
        <span className={`qc-num text-xs font-medium ${active ? "text-cream" : "text-ink-500"}`}>
          {index + 1}
        </span>
      )}
    </div>
  );
}

function ServiceProgress({ assignment }) {
  const served = Number(assignment.served_days ?? 0);
  const required = Number(assignment.required_duration_days ?? 0);
  const percent = required ? Math.min(100, Math.round((served / required) * 100)) : 0;
  return (
    <div className="mt-2 max-w-xs">
      <div className="flex justify-between mb-1">
        <span className="qc-eyebrow text-ink-500">Service period</span>
        <span className="qc-num text-xs text-ink-700">
          {served}/{required} days
        </span>
      </div>
      <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${percent >= 100 ? "bg-forest" : "bg-mustard"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
