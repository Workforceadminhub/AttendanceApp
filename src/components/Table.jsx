import { useNavigate } from "react-router-dom";
import Tag from "./ui/Tag";

/**
 * Pending workers table — Quiet Cockpit.
 *
 * Same props as before (people, handleInactive, handleActive, loading) so the
 * consuming page stays unchanged. Renders a hairline-bordered table on lg+
 * and a card stack on mobile.
 */
export default function Table({
  people = [],
  handleInactive,
  handleActive,
  loading = {},
}) {
  const navigate = useNavigate();
  const total = people.length;

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="qc-eyebrow">Approvals</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
            Pending workers
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Workers who self-registered. Review and approve, or mark inactive.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="qc-num text-2xs uppercase tracking-tag text-ink-500">
            <span className="qc-num text-base text-ink-900 font-medium mr-1.5">
              {total}
            </span>
            pending
          </span>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="qc-btn-secondary"
          >
            ← Home
          </button>
        </div>
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="qc-card p-12 text-center">
          <div className="qc-eyebrow text-ink-400">Inbox</div>
          <h2 className="mt-2 text-lg font-medium text-ink-900">
            No pending workers
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Anyone awaiting approval will show up here.
          </p>
        </div>
      )}

      {/* Mobile card stack */}
      {total > 0 && (
        <ul className="lg:hidden qc-card divide-y divide-ink-200 overflow-hidden">
          {people.map((p) => (
            <li key={p.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink-900 truncate">
                    {p.firstname} {p.lastname}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 qc-num text-2xs uppercase tracking-tag text-ink-500">
                    {p.team && <span>{p.team}</span>}
                    {p.department && <span>· {p.department}</span>}
                    {p.workerrole && <span>· {p.workerrole}</span>}
                  </div>
                </div>
                <Tag tone={p.isverified ? "success" : "warning"}>
                  {p.isverified ? "Verified" : "Pending"}
                </Tag>
              </div>
              {!p.isverified && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => !loading.inactive && handleInactive(p)}
                    disabled={loading.inactive}
                    className="qc-btn-secondary flex-1"
                  >
                    {loading.inactive ? "Marking…" : "Mark inactive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => !loading.active && handleActive(p)}
                    disabled={loading.active}
                    className="qc-btn-primary flex-1"
                  >
                    {loading.active ? "Approving…" : "Approve"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Desktop table */}
      {total > 0 && (
        <div className="hidden lg:block qc-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-cream-200 border-b border-ink-200">
                  <th className="qc-section-title px-4 py-2.5 text-left">Name</th>
                  <th className="qc-section-title px-4 py-2.5 text-left">Team</th>
                  <th className="qc-section-title px-4 py-2.5 text-left">
                    Department
                  </th>
                  <th className="qc-section-title px-4 py-2.5 text-left">Role</th>
                  <th className="qc-section-title px-4 py-2.5 text-left">
                    Status
                  </th>
                  <th className="qc-section-title px-4 py-2.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-ink-100 last:border-b-0 hover:bg-cream-200/60"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-ink-900 whitespace-nowrap">
                      {p.firstname} {p.lastname}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">
                      {p.team || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">
                      {p.department || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700 whitespace-nowrap">
                      {p.workerrole || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Tag tone={p.isverified ? "success" : "warning"}>
                        {p.isverified ? "Verified" : "Pending"}
                      </Tag>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!p.isverified && (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              !loading.inactive && handleInactive(p)
                            }
                            disabled={loading.inactive}
                            className="text-sm font-medium text-brick hover:text-brick/80 disabled:opacity-50"
                          >
                            {loading.inactive ? "Marking…" : "Inactive"}
                          </button>
                          <span className="text-ink-300">·</span>
                          <button
                            type="button"
                            onClick={() => !loading.active && handleActive(p)}
                            disabled={loading.active}
                            className="text-sm font-medium text-ink-900 hover:text-ink-700 disabled:opacity-50"
                          >
                            {loading.active ? "Approving…" : "Approve"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
