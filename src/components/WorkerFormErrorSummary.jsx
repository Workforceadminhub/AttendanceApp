import { useEffect, useRef } from "react";
import { WORKER_FIELD_LABELS } from "../utils/workerFormValidation";

export default function WorkerFormErrorSummary({ errors = {}, submitError = "" }) {
  const summaryRef = useRef(null);
  const entries = Object.entries(errors);

  useEffect(() => {
    if (!submitError) return;
    summaryRef.current?.focus();
    summaryRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [submitError]);

  if (!submitError && entries.length === 0) return null;

  const focusField = (field) => {
    const control = document.getElementById(field);
    control?.focus();
    control?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  };

  return (
    <div
      ref={summaryRef}
      role="alert"
      tabIndex={-1}
      className="mb-6 rounded-md border border-brick/30 bg-brick/5 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brick/30"
    >
      <p className="text-sm font-semibold text-ink-900">
        {submitError
          ? "The worker was not added."
          : `Check ${entries.length === 1 ? "the highlighted field" : `${entries.length} highlighted fields`}.`}
      </p>
      {submitError && <p className="mt-1 break-words text-sm text-ink-700">{submitError}</p>}
      {entries.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
          {entries.map(([field, message]) => (
            <li key={field} id={`${field}-error`}>
              <button
                type="button"
                onClick={() => focusField(field)}
                className="text-left underline decoration-brick/40 underline-offset-2 hover:decoration-brick focus:outline-none focus-visible:ring-2 focus-visible:ring-brick/30"
              >
                <span className="font-medium">{WORKER_FIELD_LABELS[field] || field}:</span>{" "}
                {message}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-sm text-ink-600">Your information is still here. Correct it and try again.</p>
    </div>
  );
}
