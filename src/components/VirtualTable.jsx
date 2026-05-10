import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/**
 * A simple virtual-scrolling table for long worker / dept lists.
 * Drop-in replacement for `items.map(...)` rendering in tables with > ~50 rows.
 *
 * Usage:
 *   <VirtualTable
 *     items={workers}
 *     rowHeight={56}
 *     renderHeader={() => (
 *       <tr>
 *         <th>Name</th><th>Email</th><th>Phone</th>
 *       </tr>
 *     )}
 *     renderRow={(worker, idx) => (
 *       <tr key={worker.id}>
 *         <td>{worker.fullname}</td>
 *         <td>{worker.email}</td>
 *         <td>{worker.phonenumber}</td>
 *       </tr>
 *     )}
 *   />
 *
 * Notes:
 *   - The container has fixed height; pass `height` to override (default 600px).
 *   - Row height must be predictable — pass `rowHeight` matching the actual
 *     CSS row height (or use estimateSize prop for variable heights).
 *   - The wrapper renders a div, not a <table>, because virtualization needs
 *     absolute positioning on rows. Use this only for *visual* tables; if you
 *     need real semantic <table> markup for screen readers, virtualization is
 *     more complex and not yet supported here.
 */
export default function VirtualTable({
  items = [],
  rowHeight = 56,
  height = 600,
  overscan = 8,
  renderRow,
  renderHeader,
  emptyState = "No items",
  className = "",
}) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  if (!items.length) {
    return (
      <div className={`text-ink-500 text-sm py-8 text-center ${className}`}>
        {emptyState}
      </div>
    );
  }

  return (
    <div className={className}>
      {renderHeader && <div className="sticky top-0 bg-white z-10">{renderHeader()}</div>}
      <div
        ref={parentRef}
        style={{ height, overflow: "auto" }}
        className="border border-ink-200 rounded"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderRow(item, virtualRow.index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
