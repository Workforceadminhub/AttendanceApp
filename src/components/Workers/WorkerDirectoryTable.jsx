import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

const TH = "px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wider";
const CHECKBOX = "h-4 w-4 text-ink-900 focus:ring-ink-900/10 border-ink-300 rounded";

/**
 * Worker directory table shared by the admin, church admin and department lists.
 *
 * columns: [{ key, header, sortKey?, render(row, index), className?, interactive? }]
 *   sortKey     makes the header a sort button (needs `sort` + `onSort`)
 *   interactive stops clicks in the cell from following the row link
 * selection: { allChecked, onToggleAll, isChecked(row), onToggle(row), isDisabled?(row) }
 * getRowHref(row): where a row click goes; return null for a row that is not a link
 * isExpanded(row, index) + renderDetails(row): optional details row
 */
export default function WorkerDirectoryTable({
  columns,
  rows,
  rowKey = (row, index) => row.id ?? index,
  sort,
  onSort,
  selection,
  getRowHref,
  isExpanded,
  renderDetails,
  empty = null,
}) {
  const navigate = useNavigate();
  const colSpan = columns.length + (selection ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-ink-200">
        <thead className="bg-cream">
          <tr>
            {selection && (
              <th scope="col" className={TH}>
                <input
                  type="checkbox"
                  aria-label="Select all workers"
                  checked={selection.allChecked}
                  onChange={selection.onToggleAll}
                  className={CHECKBOX}
                />
              </th>
            )}
            {columns.map((col) => {
              const sortable = Boolean(col.sortKey && onSort);
              const active = sortable && sort?.key === col.sortKey;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={TH}
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.sortKey)}
                      className="inline-flex items-center hover:text-ink-900 cursor-pointer uppercase font-medium"
                    >
                      {col.header}
                      {active &&
                        (sort.direction === "asc" ? (
                          <ChevronUpIcon className="h-3 w-3 inline-block ml-1" />
                        ) : (
                          <ChevronDownIcon className="h-3 w-3 inline-block ml-1" />
                        ))}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-ink-200">
          {rows.map((row, index) => {
            const href = getRowHref ? getRowHref(row) : null;
            return (
              <Fragment key={rowKey(row, index)}>
                <tr
                  onClick={href ? () => navigate(href) : undefined}
                  className={href ? "cursor-pointer hover:bg-cream-200 transition-colors" : undefined}
                >
                  {selection && (
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="Select worker"
                        checked={selection.isChecked(row)}
                        onChange={() => selection.onToggle(row)}
                        disabled={selection.isDisabled ? selection.isDisabled(row) : false}
                        className={CHECKBOX}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${col.className ?? "text-ink-500"}`}
                      onClick={col.interactive ? (e) => e.stopPropagation() : undefined}
                    >
                      {col.render(row, index)}
                    </td>
                  ))}
                </tr>
                {renderDetails && isExpanded?.(row, index) && (
                  <tr className="bg-cream">
                    <td colSpan={colSpan} className="px-6 py-4">
                      {renderDetails(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && empty && (
            <tr>
              <td colSpan={colSpan} className="px-6 py-8 text-center text-ink-500">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Labelled values shown in a worker's expanded row. Empty values show a hyphen. */
export function WorkerDetailsGrid({ items }) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(({ label, value, wide }) => (
        <div key={label} className={wide ? "md:col-span-2 lg:col-span-3" : undefined}>
          <dt className="block text-sm font-medium text-ink-700">{label}</dt>
          <dd className="mt-1 text-sm text-ink-900">{value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export const formatWorkerPhone = (phone) => (phone ? (phone.startsWith("0") ? phone : `0${phone}`) : "");
