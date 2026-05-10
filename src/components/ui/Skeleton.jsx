import clsx from "clsx";

/**
 * Tailwind-only skeleton primitives. Replaces spinners with content-shaped
 * placeholders for ~2x perceived speed improvement. Uses tailwind's animate-pulse.
 *
 * Migration tip: anywhere you see <LoadingState /> or a centered spinner
 * inside a card/list, swap in <SkeletonRow /> or <SkeletonCard /> sized to
 * match the eventual content.
 */
export default function Skeleton({ className = "", as: Tag = "div" }) {
  return (
    <Tag className={clsx("bg-ink-200 rounded animate-pulse", className)} aria-hidden />
  );
}

/** Single-line skeleton row. */
export function SkeletonRow({ width = "100%", height = 16, className = "" }) {
  return (
    <Skeleton
      className={className}
      style={{ width, height }}
    />
  );
}

/** Card-shaped skeleton block — useful for dashboard widgets. */
export function SkeletonCard({ lines = 3, className = "" }) {
  return (
    <div className={clsx("p-4 border rounded-lg space-y-3 bg-white", className)}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={clsx("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Multiple table-row skeletons stacked. */
export function SkeletonTable({ rows = 5, columns = 4, className = "" }) {
  return (
    <div className={clsx("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
