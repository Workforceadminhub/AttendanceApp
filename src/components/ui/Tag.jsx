import clsx from "clsx";

/**
 * Tag - terminal-style status indicator.
 *
 * Rendered as: ■ LABEL  (uppercase, tracked, mono-feel)
 * Replaces rounded-full pill badges. The square block carries the tone color;
 * type stays high-contrast so info is legible at a glance.
 *
 * Tones:
 *  - neutral   (default)
 *  - live      sienna - reserved for "happening now"
 *  - success   forest
 *  - warning   mustard
 *  - danger    brick
 *  - info      ink
 */
const TONES = {
  neutral: { dot: "bg-ink-400", text: "text-ink-700" },
  live: { dot: "bg-sienna", text: "text-sienna-dark" },
  success: { dot: "bg-forest", text: "text-forest" },
  warning: { dot: "bg-mustard", text: "text-mustard" },
  danger: { dot: "bg-brick", text: "text-brick" },
  info: { dot: "bg-ink-900", text: "text-ink-900" },
};

export default function Tag({ tone = "neutral", live = false, children, className }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-tag font-medium",
        t.text,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={clsx("inline-block w-2 h-2", t.dot, live && "animate-live-pulse")}
      />
      {children}
    </span>
  );
}
