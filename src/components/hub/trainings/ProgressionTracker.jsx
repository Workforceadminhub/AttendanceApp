const STAGES = [
  { key: "level_1", label: "Level 1 (BLC)", description: "Believers' Love Class" },
  { key: "serving", label: "Serving", description: "Active in a department" },
  { key: "level_2", label: "Level 2 (ALC)", description: "Advanced Leaders' Class" },
  { key: "leadership", label: "Leadership", description: "Team/Department leader" },
];

export default function ProgressionTracker({ currentStage, completedStages = [] }) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="qc-card p-5">
      <h3 className="qc-section-title mb-4">Training Progression</h3>
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-3.5 top-4 bottom-4 w-px bg-ink-200" />

        <div className="space-y-4">
          {STAGES.map((stage, i) => {
            const isComplete = completedStages.includes(stage.key) || i < currentIdx;
            const isCurrent = i === currentIdx;
            const isFuture = !isComplete && !isCurrent;

            return (
              <div key={stage.key} className="relative flex items-start gap-3 pl-0">
                {/* Node */}
                <div
                  className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 transition-colors ${
                    isComplete
                      ? "bg-forest border-forest"
                      : isCurrent
                      ? "bg-white border-ink-900"
                      : "bg-cream border-ink-300"
                  }`}
                >
                  {isComplete && (
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 7l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isCurrent && (
                    <div className="w-2 h-2 rounded-full bg-ink-900" />
                  )}
                </div>

                {/* Label */}
                <div className={isFuture ? "opacity-50" : ""}>
                  <div
                    className={`text-sm font-medium ${
                      isCurrent ? "text-ink-900" : isComplete ? "text-forest" : "text-ink-500"
                    }`}
                  >
                    {stage.label}
                  </div>
                  <div className="text-xs text-ink-500">{stage.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
