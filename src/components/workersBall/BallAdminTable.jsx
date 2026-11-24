import { CheckIcon, ClipboardDocumentIcon, LinkIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { formatDateSafe, PAGE_SIZE } from "./adminUtils";

export default function BallAdminTable(props) {
  const {
    isEligibleTab,
    loadingEligible,
    eligibleError,
    loadEligible,
    filteredEligible,
    hasActiveFilters,
    clearFilters,
    isWorkerSelected,
    handleToggleSelectAllEligible,
    paginatedRows,
    startIndex,
    getWorkerTargetId,
    inviteUrlByWorkerId,
    toggleSelectWorkerToInvite,
    handleQuickResendInvite,
    resendingWorkerId,
    handleCopyInviteUrl,
    copiedInviteUrl,
    loading,
    error,
    loadData,
    filteredRegistrations,
    setSelectedWorker,
    handleCopyCode,
    copiedCode,
    activeRows,
    setCurrentPage,
    safePage,
    totalPages,
  } = props;
  return (
    <>
        <div className="rounded-xl border border-ink-200 bg-white shadow-xs overflow-hidden">
          {isEligibleTab ? (
            loadingEligible ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-ink">
                  Loading eligible workers...
                </p>
              </div>
            ) : eligibleError ? (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-brick mb-2">
                  {eligibleError}
                </p>
                <button
                  type="button"
                  onClick={() => loadEligible(true)}
                  className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-xs font-medium text-cream hover:bg-ink-900 transition"
                >
                  Retry
                </button>
              </div>
            ) : filteredEligible.length === 0 ? (
              <div className="p-12 text-center">
                <h3 className="text-base font-semibold text-ink">
                  No eligible workers found
                </h3>
                <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "Try loosening your search term, department, or team filter."
                    : "Click Fetch Eligible to load eligible workers from the server."}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadEligible(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-sienna px-3 py-1.5 text-xs font-semibold text-white hover:bg-sienna-dark"
                  >
                    Fetch Eligible
                  </button>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink hover:bg-ink-50"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-ink-200 bg-ink-50/70 text-ink-700 font-mono text-2xs uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all eligible workers"
                          checked={
                            filteredEligible.length > 0 &&
                            filteredEligible.every((w) => isWorkerSelected(w))
                          }
                          onChange={() =>
                            handleToggleSelectAllEligible(filteredEligible)
                          }
                          className="h-4 w-4 rounded border-ink-300 text-sienna focus:ring-sienna cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold w-12">#</th>
                      <th className="py-3 px-4 font-semibold">Worker</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold hidden md:table-cell">
                        Department / Team
                      </th>
                      <th className="py-3 px-4 font-semibold hidden lg:table-cell">
                        Contact
                      </th>
                      <th className="py-3 px-4 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {paginatedRows.map((row, index) => {
                      const sn = startIndex + index + 1;
                      const targetId = getWorkerTargetId(row);
                      const checked = isWorkerSelected(row);
                      const inviteLink =
                        row.inviteUrl || inviteUrlByWorkerId[String(targetId)];

                      return (
                        <tr
                          key={targetId || index}
                          className={`transition cursor-pointer ${
                            checked
                              ? "bg-amber-50/60"
                              : "hover:bg-amber-50/30"
                          }`}
                          onClick={() => toggleSelectWorkerToInvite(row)}
                        >
                          <td
                            className="py-3.5 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${row.name}`}
                              checked={checked}
                              onChange={() => toggleSelectWorkerToInvite(row)}
                              className="h-4 w-4 rounded border-ink-300 text-sienna focus:ring-sienna cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-mono text-ink-400">
                            {sn}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-ink text-sm">
                              {row.name}
                            </div>
                            <div className="text-2xs text-ink-500 font-medium">
                              {row.role || "Worker"}{" "}
                              {targetId ? `• #${targetId}` : ""}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {row.registered ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 w-max">
                                REGISTERED
                              </span>
                            ) : row.invited ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-amber-50 text-amber-800 border border-amber-200 w-max">
                                INVITED
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-ink-100 text-ink-800 border border-ink-200 w-max">
                                ELIGIBLE
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 hidden md:table-cell">
                            <div className="text-ink font-medium">
                              {row.department || "Unassigned"}
                            </div>
                            <div className="text-2xs text-ink-500">
                              {row.team || "Unassigned"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 hidden lg:table-cell">
                            <div className="text-ink font-mono text-2xs truncate max-w-xs">
                              {row.email || "-"}
                            </div>
                            <div className="text-2xs text-ink-500 font-mono">
                              {row.phone || "-"}
                            </div>
                          </td>
                          <td
                            className="py-3.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {targetId && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickResendInvite(row, e)}
                                  disabled={resendingWorkerId === targetId}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-sienna bg-sienna/10 hover:bg-sienna/20 border border-sienna/25 transition disabled:opacity-50 cursor-pointer"
                                >
                                  <PaperAirplaneIcon className="h-3 w-3" />
                                  {resendingWorkerId === targetId
                                    ? "Sending..."
                                    : "Invite"}
                                </button>
                              )}
                              {inviteLink && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopyInviteUrl(inviteLink, e)
                                  }
                                  title="Copy Personal Invite Link"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-ink-700 bg-white hover:bg-ink-50 border border-ink-200 transition cursor-pointer"
                                >
                                  {copiedInviteUrl === inviteLink ? (
                                    <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                  ) : (
                                    <LinkIcon className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : loading ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium text-ink">
                Loading registrations...
              </p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-brick mb-2">{error}</p>
              <button
                type="button"
                onClick={() => loadData()}
                className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-xs font-medium text-cream hover:bg-ink-900 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-base font-semibold text-ink">
                No registrations found
              </h3>
              <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Try loosening your search term or filter criteria."
                  : "No workforce registrations recorded yet."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink hover:bg-ink-50"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/70 text-ink-700 font-mono text-2xs uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold w-12">#</th>
                    <th className="py-3 px-4 font-semibold">Worker</th>
                    <th className="py-3 px-4 font-semibold">Access Code</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">
                      Department / Team
                    </th>
                    <th className="py-3 px-4 font-semibold hidden lg:table-cell">
                      Contact
                    </th>
                    <th className="py-3 px-4 font-semibold hidden xl:table-cell">
                      Registered
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {paginatedRows.map((row, index) => {
                    const sn = startIndex + index + 1;
                    const isAttended = row.attended;

                    return (
                      <tr
                        key={row.id || row.code || index}
                        className="hover:bg-amber-50/30 transition cursor-pointer"
                        onClick={() => setSelectedWorker(row)}
                      >
                        {/* Serial Number */}
                        <td className="py-3.5 px-4 font-mono text-ink-400">
                          {sn}
                        </td>

                        {/* Worker Name & Role */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-ink text-sm">
                            {row.name}
                          </div>
                          <div className="text-2xs text-ink-500 font-medium">
                            {row.role || "Worker"}
                          </div>
                        </td>

                        {/* HGWB Access Code */}
                        <td className="py-3.5 px-4">
                          {row.code ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-ink-100 border border-ink-200 text-ink-900 tracking-wider">
                                {row.code}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyCode(row.code, e)}
                                title="Copy Access Code"
                                className="p-1 rounded text-ink-400 hover:text-ink hover:bg-ink-100 transition"
                              >
                                {copiedCode === row.code ? (
                                  <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : row.status === "pending" ? (
                            <span className="text-amber-700 font-mono text-2xs">Pending</span>
                          ) : (
                            <span className="text-ink-400 font-mono text-2xs">-</span>
                          )}
                        </td>

                        {/* Attendance Status */}
                        <td className="py-3.5 px-4">
                          {isAttended ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 w-max">
                                ATTENDED
                              </span>
                              {row.attendedAt && (
                                <span className="text-3xs text-ink-500 font-mono pl-0.5">
                                  {formatDateSafe(row.attendedAt, "h:mm a")}
                                </span>
                              )}
                            </div>
                          ) : row.status === "pending" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-amber-50 text-amber-800 border border-amber-200 w-max">
                              PENDING
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold font-mono bg-ink-100 text-ink-800 border border-ink-200 w-max">
                              REGISTERED
                            </span>
                          )}
                        </td>

                        {/* Department / Team */}
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="text-ink font-medium">
                            {row.department || "Unassigned"}
                          </div>
                          <div className="text-2xs text-ink-500">
                            {row.team || "Unassigned"}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          <div className="text-ink font-mono text-2xs truncate max-w-xs">
                            {row.email || "-"}
                          </div>
                          <div className="text-2xs text-ink-500 font-mono">
                            {row.phone || "-"}
                          </div>
                        </td>

                        {/* Registered Date */}
                        <td className="py-3.5 px-4 hidden xl:table-cell text-ink-500 font-mono text-2xs">
                          {formatDateSafe(row.registeredAt, "dd MMM, h:mm a")}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {row.status === "pending" && (row.workerId || row.id) && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickResendInvite(row, e)}
                                disabled={resendingWorkerId === (row.workerId ?? row.id)}
                                title="Send or Resend Workers Ball Invite"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-sienna bg-sienna/10 hover:bg-sienna/20 border border-sienna/25 transition disabled:opacity-50 cursor-pointer"
                              >
                                <PaperAirplaneIcon className="h-3 w-3" />
                                {resendingWorkerId === (row.workerId ?? row.id)
                                  ? "Sending..."
                                  : "Resend"}
                              </button>
                            )}
                            {(row.inviteUrl ||
                              inviteUrlByWorkerId[String(row.workerId ?? row.id)]) && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleCopyInviteUrl(
                                    row.inviteUrl ||
                                      inviteUrlByWorkerId[String(row.workerId ?? row.id)],
                                    e
                                  )
                                }
                                title="Copy Personal Invite Link"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-ink-700 bg-white hover:bg-ink-50 border border-ink-200 transition cursor-pointer"
                              >
                                {copiedInviteUrl ===
                                (row.inviteUrl ||
                                  inviteUrlByWorkerId[String(row.workerId ?? row.id)]) ? (
                                  <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                ) : (
                                  <LinkIcon className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorker(row);
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-ink-700 bg-ink-50 hover:bg-ink-100 border border-ink-200 transition cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {!(isEligibleTab ? loadingEligible : loading) &&
            activeRows.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-ink-200 px-4 py-3 bg-white">
                <span className="text-xs text-ink-500 font-mono">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + PAGE_SIZE, activeRows.length)} of{" "}
                  {activeRows.length} results
                </span>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <span className="px-3 text-xs font-mono text-ink-700">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safePage >= totalPages}
                    className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>
    </>
  );
}
