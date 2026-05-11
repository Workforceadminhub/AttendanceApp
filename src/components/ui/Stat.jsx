import clsx from "clsx";

/**
 * Stat — KPI tile.
 *
 * eyebrow:   small uppercase label
 * value:     the headline number (rendered in Geist Mono, tabular)
 * unit:      optional suffix (e.g. "%", "workers")
 * delta:     optional small change indicator { value, tone }
 * footnote:  optional muted line beneath
 *
 * Hairline-bordered, no shadow. Densely scannable.
 */
export default function Stat({
  eyebrow,
  value,
  unit,
  delta,
  footnote,
  loading = false,
  className,
}) {
  return (
    <div
      className={clsx(
        "qc-card p-4 sm:p-5 flex flex-col justify-between min-h-[112px]",
        className
      )}
    >
      <div className="qc-eyebrow">{eyebrow}</div>

      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <span className="qc-num text-3xl text-ink-300 select-none">-</span>
        ) : (
          <>
            <span className="qc-num text-3xl text-ink-900 font-medium leading-none">
              {value}
            </span>
            {unit && (
              <span className="text-sm text-ink-500 font-medium">{unit}</span>
            )}
            {delta && <Delta {...delta} />}
          </>
        )}
      </div>

      {footnote && (
        <div className="mt-3 text-xs text-ink-500">{footnote}</div>
      )}
    </div>
  );
}

function Delta({ value, tone = "neutral" }) {
  const tones = {
    up: "text-forest",
    down: "text-brick",
    neutral: "text-ink-500",
  };
  const arrow = tone === "up" ? "↑" : tone === "down" ? "↓" : "·";
  return (
    <span className={clsx("qc-num text-xs font-medium ml-1", tones[tone])}>
      {arrow} {value}
    </span>
  );
}
