import clsx from "clsx";

/**
 * DataTable - table on `lg+`, card-stack below.
 *
 * Columns spec:
 *   {
 *     key:        unique id
 *     header:     column label
 *     render:     (row) => ReactNode  (cell content)
 *     mono:       boolean - render with mono numerals (counts, %, IDs, dates)
 *     align:      "left" | "right" | "center"
 *     hideOnSm:   hide this column on the mobile card view
 *     primary:    show as the title in the mobile card
 *     secondary:  show beneath the title in the mobile card (muted)
 *     trailing:   show on the right side of the mobile card (status, count, etc.)
 *   }
 *
 * Each row's onClick (if provided) makes the entire row a tap target - the
 * mobile card surface is a single 44px+ tap zone.
 *
 * Keep the desktop table dense and the mobile cards generous. Same data,
 * different rhythm.
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (r, i) => r.id ?? i,
  onRowClick,
  empty = "No records.",
  loading = false,
  loadingRows = 5,
  className,
}) {
  if (loading) {
    return <DataTableLoading columns={columns} rows={loadingRows} className={className} />;
  }

  if (!rows?.length) {
    return (
      <div className={clsx("qc-card p-8 text-center text-ink-500 text-sm", className)}>
        {empty}
      </div>
    );
  }

  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const secondaryCol = columns.find((c) => c.secondary);
  const trailingCol = columns.find((c) => c.trailing);

  return (
    <div className={className}>
      {/* Mobile: card-stack (default → hidden at lg) */}
      <ul className="lg:hidden flex flex-col qc-card divide-y divide-ink-200 overflow-hidden">
        {rows.map((row, i) => {
          const interactive = !!onRowClick;
          const Tag = interactive ? "button" : "div";
          return (
            <li key={rowKey(row, i)} className="contents">
              <Tag
                {...(interactive ? { onClick: () => onRowClick(row), type: "button" } : {})}
                className={clsx(
                  "w-full text-left px-4 py-3 flex items-center gap-3 min-h-touch",
                  interactive && "hover:bg-cream-200 active:bg-cream-200/80 transition-colors"
                )}
              >
                <div className="flex-1 min-w-0">
                  {primaryCol && (
                    <div className="text-sm font-medium text-ink-900 truncate">
                      {primaryCol.render(row)}
                    </div>
                  )}
                  {secondaryCol && (
                    <div className="mt-0.5 text-xs text-ink-500 truncate">
                      {secondaryCol.render(row)}
                    </div>
                  )}
                </div>
                {trailingCol && (
                  <div className="shrink-0 text-right">{trailingCol.render(row)}</div>
                )}
              </Tag>
            </li>
          );
        })}
      </ul>

      {/* Desktop: dense table (hidden by default → shown at lg) */}
      <div className="hidden lg:block qc-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-cream-200 border-b border-ink-200">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={clsx(
                      "qc-section-title px-4 py-2.5 text-left whitespace-nowrap",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center"
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(
                    "border-b border-ink-100 last:border-b-0",
                    onRowClick && "cursor-pointer hover:bg-cream-200 transition-colors"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        "px-4 py-3 text-sm text-ink-900 align-middle",
                        col.mono && "qc-num",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center"
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DataTableLoading({ columns, rows, className }) {
  const skeletonRows = Array.from({ length: rows });
  return (
    <div className={className}>
      {/* Mobile skeleton */}
      <ul className="lg:hidden qc-card divide-y divide-ink-200 overflow-hidden">
        {skeletonRows.map((_, i) => (
          <li key={i} className="px-4 py-3 flex items-center gap-3 min-h-touch">
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-ink-100 rounded w-2/3" />
              <div className="h-3 bg-ink-100 rounded w-1/3" />
            </div>
            <div className="h-3 bg-ink-100 rounded w-12" />
          </li>
        ))}
      </ul>
      {/* Desktop skeleton */}
      <div className="hidden lg:block qc-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-cream-200 border-b border-ink-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="qc-section-title px-4 py-2.5 text-left whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((_, i) => (
              <tr key={i} className="border-b border-ink-100 last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-3.5 bg-ink-100 rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
