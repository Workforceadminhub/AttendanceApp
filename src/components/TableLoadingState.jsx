import React from "react";

/**
 * TableLoadingState — must be rendered inside a parent <table>.
 *
 * The previous implementation had two bugs:
 *  - the inner loop reused `length` (rows), producing a square skeleton
 *  - empty <td> tags collapsed to zero height
 *
 * This version emits `length` rows × 5 columns of hairline-bordered
 * skeleton cells. Pulse animation honors `prefers-reduced-motion`.
 */
function TableLoadingState({ length = 5, columns = 5 }) {
  const rows = Math.max(1, length);
  const cols = Math.max(1, columns);
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr
          key={rowIdx}
          className="border-b border-ink-100 last:border-b-0"
        >
          {Array.from({ length: cols }).map((__, colIdx) => (
            <td key={colIdx} className="px-4 py-3.5">
              <div className="h-3.5 bg-ink-100 rounded-sm animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default TableLoadingState;
