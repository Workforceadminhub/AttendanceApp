import SuccessMark from "../ui/SuccessMark";

/* Shared UI primitives for the public meeting confirm / present pages. */

export const inputClass =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition";

export const selectClass = `${inputClass} appearance-none`;

export const primaryButtonClass =
  "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-8 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed";

export const DISTRICT_SUB_TEAM_OPTIONS = ["Pastor Biola Cluster", "Pastor Isaac Cluster"];

export function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-sienna">{message}</p>;
}

export function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-1">
      {children}
      {required && <span className="text-sienna ml-0.5">*</span>}
    </label>
  );
}

export function ReadonlyField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-500 mb-1">{label}</p>
      <p className="rounded-lg border border-ink-200 bg-ink-100 px-3 py-2.5 text-sm text-ink">
        {value || <span className="text-ink-400 italic">-</span>}
      </p>
    </div>
  );
}

export function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
    >
      &larr; Back
    </button>
  );
}

/** Yellow "Missing" badge shown next to labels of fields the worker still has to fill in. */
export function MissingBadge() {
  return (
    <span className="ml-1.5 inline-block rounded bg-mustard-50 px-1.5 py-0.5 text-2xs font-medium text-mustard">
      Missing
    </span>
  );
}

/** District/Sub-team (cluster) select, shown only when the worker's team is Districts. */
export function DistrictSubTeamField({ id, value, onChange, error, badge, className }) {
  return (
    <div className={className}>
      <Label htmlFor={id} required>
        District/Sub-team{badge}
      </Label>
      <select id={id} value={value} onChange={onChange} className={selectClass}>
        <option value="">Select District/Sub-team</option>
        {DISTRICT_SUB_TEAM_OPTIONS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

/** Copy for the confirm-flow success screen, keyed by the outcome variant. */
export const CONFIRM_SUCCESS_COPY = {
  confirm: {
    title: "Confirmation Status is Confirmed",
    message: "See you at the meeting.",
  },
  decline: {
    title: "Response Recorded",
    message: "Thank you for letting us know. We hope to see you at a future meeting.",
  },
  create: {
    title: "Details Submitted",
    message: "Thank you for adding your details. Your information has been submitted successfully.",
  },
};

export function SuccessScreen({ title, message, actionLabel, onAction }) {
  return (
    <div className="text-center py-8 space-y-5">
      <div className="space-y-3">
        <SuccessMark className="mx-auto h-14 w-14 text-forest" />
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink-500 leading-relaxed max-w-sm mx-auto">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center rounded-lg bg-ink px-6 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** Page chrome: logo header with the meeting title, centred content column, footer. */
export function Shell({ title, children }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-ink-200 bg-cream">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Harvesters"
            className="h-12 w-auto select-none mix-blend-multiply"
          />
          <span className="hidden sm:inline-block h-4 w-px bg-ink-200" />
          <span className="hidden sm:inline-block text-sm text-ink-500 font-mono">{title}</span>
        </div>
      </header>

      <main className="flex-1 px-5 py-10 sm:px-8">
        <div className="max-w-xl mx-auto">{children}</div>
      </main>

      <footer className="border-t border-ink-200 py-5 px-5 sm:px-8 text-center text-xs text-ink-500">
        Harvesters International Christian Centre, Gbagada Campus
      </footer>
    </div>
  );
}
