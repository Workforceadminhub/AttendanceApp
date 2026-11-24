import GenericModal from "../GenericModal";
import { CheckIcon, ClipboardDocumentIcon, EnvelopeIcon, MagnifyingGlassIcon, PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function BallInviteModal(props) {
  const {
    inviteModalOpen,
    setInviteModalOpen,
    loadEligible,
    modalEligibleSearch,
    loadingEligible,
    modalFilteredEligible,
    eligibleWorkers,
    handleToggleSelectAllEligible,
    isWorkerSelected,
    handleInviteAllEligible,
    sendingInvites,
    setModalEligibleSearch,
    modalDepartmentFilter,
    setModalDepartmentFilter,
    departmentOptions,
    modalTeamFilter,
    setModalTeamFilter,
    teamOptions,
    eligibleError,
    getWorkerTargetId,
    toggleSelectWorkerToInvite,
    handleQuickResendInvite,
    resendingWorkerId,
    handleInviteSearch,
    inviteSearchTerm,
    setInviteSearchTerm,
    inviteSearching,
    inviteSearchResults,
    selectedToInvite,
    setSelectedToInvite,
    manualWorkerIdsInput,
    setManualWorkerIdsInput,
    lastInviteResult,
    handleCopyInviteUrl,
    copiedInviteUrl,
    handleSendInvitesSubmit,
  } = props;
  return (
    <>
        {inviteModalOpen && (
          <GenericModal
            isOpen={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            title="Send Workers Ball Invitations"
            size="large"
          >
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-ink-600 leading-relaxed">
                  Fetch eligible workers, filter by department or team, and invite one, selected, or all eligible workers.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    loadEligible(
                      true,
                      modalEligibleSearch.trim()
                        ? { search: modalEligibleSearch.trim() }
                        : {}
                    )
                  }
                  disabled={loadingEligible}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sienna/30 bg-sienna/10 px-3 py-1.5 text-xs font-semibold text-sienna hover:bg-sienna/20 disabled:opacity-50 transition cursor-pointer shrink-0"
                >
                  {loadingEligible ? "Fetching..." : "Fetch / Refresh Eligible"}
                </button>
              </div>

              {/* Eligible Workers Filter & Selection Panel */}
              <div className="rounded-xl border border-ink-200 bg-ink-50/40 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-2xs font-mono uppercase tracking-wider text-ink-700 font-semibold">
                    Eligible Workers ({modalFilteredEligible.length} of{" "}
                    {eligibleWorkers.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleSelectAllEligible(modalFilteredEligible)
                      }
                      disabled={modalFilteredEligible.length === 0}
                      className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2.5 py-1 text-2xs font-semibold text-ink hover:bg-ink-50 disabled:opacity-50 cursor-pointer"
                    >
                      {modalFilteredEligible.length > 0 &&
                      modalFilteredEligible.every((w) => isWorkerSelected(w))
                        ? "Deselect All"
                        : `Select All (${modalFilteredEligible.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInviteAllEligible(modalFilteredEligible)
                      }
                      disabled={
                        sendingInvites || modalFilteredEligible.length === 0
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-sienna px-2.5 py-1 text-2xs font-semibold text-white hover:bg-sienna-dark disabled:opacity-50 cursor-pointer"
                    >
                      <PaperAirplaneIcon className="h-3 w-3" />
                      {sendingInvites
                        ? "Sending..."
                        : `Invite All (${modalFilteredEligible.length})`}
                    </button>
                  </div>
                </div>

                {/* Modal Filters: Search, Department, Team */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="search"
                    value={modalEligibleSearch}
                    onChange={(e) => setModalEligibleSearch(e.target.value)}
                    placeholder="Filter eligible by name, email..."
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink placeholder:text-ink-400 focus:border-sienna focus:outline-hidden"
                  />
                  <select
                    aria-label="Modal Filter by Department"
                    value={modalDepartmentFilter}
                    onChange={(e) => setModalDepartmentFilter(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink focus:border-sienna focus:outline-hidden"
                  >
                    <option value="All">All Departments</option>
                    {departmentOptions
                      .filter((d) => d !== "All")
                      .map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                  </select>
                  <select
                    aria-label="Modal Filter by Team"
                    value={modalTeamFilter}
                    onChange={(e) => setModalTeamFilter(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink focus:border-sienna focus:outline-hidden"
                  >
                    <option value="All">All Teams</option>
                    {teamOptions
                      .filter((t) => t !== "All")
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Eligible Workers List */}
                {loadingEligible ? (
                  <p className="py-4 text-center text-xs text-ink-500">
                    Loading eligible workers...
                  </p>
                ) : eligibleError ? (
                  <p className="py-3 text-center text-xs text-brick">
                    {eligibleError}
                  </p>
                ) : modalFilteredEligible.length === 0 ? (
                  <p className="py-3 text-center text-xs text-ink-500">
                    No eligible workers match the current filters.
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white max-h-56 overflow-y-auto">
                    {modalFilteredEligible.map((w, idx) => {
                      const targetId = getWorkerTargetId(w);
                      const isSelected = isWorkerSelected(w);
                      return (
                        <li
                          key={targetId || idx}
                          className={`px-3 py-2 flex items-center justify-between gap-2 text-xs transition ${
                            isSelected ? "bg-amber-50/80" : "hover:bg-ink-50/60"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelectWorkerToInvite(w)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <span
                              className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                                isSelected
                                  ? "bg-sienna border-sienna text-white"
                                  : "border-ink-300 bg-white"
                              }`}
                            >
                              {isSelected && (
                                <CheckIcon className="h-3 w-3" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink truncate">
                                  {w.name}
                                </span>
                                {targetId && (
                                  <span className="font-mono text-2xs text-ink-400">
                                    #{targetId}
                                  </span>
                                )}
                                {w.registered && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-3xs font-mono font-semibold text-emerald-800">
                                    Registered
                                  </span>
                                )}
                                {!w.registered && w.invited && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-3xs font-mono font-semibold text-amber-800">
                                    Invited
                                  </span>
                                )}
                              </div>
                              <div className="text-2xs text-ink-500 truncate">
                                {[w.department, w.team, w.email]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </div>
                          </button>

                          {targetId && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickResendInvite(w, e)}
                              disabled={resendingWorkerId === targetId}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-semibold text-sienna bg-sienna/10 hover:bg-sienna/20 border border-sienna/25 transition disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                              <PaperAirplaneIcon className="h-3 w-3" />
                              {resendingWorkerId === targetId
                                ? "Sending..."
                                : "Invite"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Search Workforce Form */}
              <form onSubmit={handleInviteSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="h-4 w-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={inviteSearchTerm}
                    onChange={(e) => setInviteSearchTerm(e.target.value)}
                    placeholder="Search worker by name (e.g. Chidi, Ayodeji)..."
                    className="w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-400 focus:border-sienna focus:outline-hidden focus:ring-1 focus:ring-sienna"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviteSearching}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-cream hover:bg-ink-900 disabled:opacity-50 transition cursor-pointer shrink-0"
                >
                  {inviteSearching ? "Searching..." : "Search"}
                </button>
              </form>

              {/* Search Results List */}
              {inviteSearchResults.length > 0 && (
                <div className="rounded-xl border border-ink-200 bg-white overflow-hidden">
                  <div className="bg-ink-50/70 px-3.5 py-2 border-b border-ink-200 flex items-center justify-between text-2xs font-mono uppercase tracking-wider text-ink-600">
                    <span>Search Results ({inviteSearchResults.length})</span>
                    <span>Click to select</span>
                  </div>
                  <ul className="divide-y divide-ink-100 max-h-56 overflow-y-auto">
                    {inviteSearchResults.map((w) => {
                      const isSelected = selectedToInvite.some(
                        (s) => String(s.id) === String(w.id)
                      );
                      return (
                        <li key={w.id}>
                          <button
                            type="button"
                            onClick={() => toggleSelectWorkerToInvite(w)}
                            className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition cursor-pointer ${
                              isSelected
                                ? "bg-amber-50/80 text-ink-900"
                                : "hover:bg-ink-50/60 text-ink"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate">
                                  {w.name}
                                </span>
                                <span className="font-mono text-2xs text-ink-400">
                                  #{w.id}
                                </span>
                                {w.registered && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-3xs font-mono font-semibold text-emerald-800">
                                    Registered
                                  </span>
                                )}
                              </div>
                              <div className="text-2xs text-ink-500 truncate">
                                {[w.department, w.team, w.email]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            </div>
                            <span
                              className={`h-5 w-5 rounded flex items-center justify-center border shrink-0 ${
                                isSelected
                                  ? "bg-sienna border-sienna text-white"
                                  : "border-ink-300 bg-white"
                              }`}
                            >
                              {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Selected Workers Chips */}
              {selectedToInvite.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-2xs font-mono uppercase tracking-wider text-ink-500">
                    <span>Selected Workers ({selectedToInvite.length})</span>
                    <button
                      type="button"
                      onClick={() => setSelectedToInvite([])}
                      className="text-brick hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedToInvite.map((w) => (
                      <span
                        key={w.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink"
                      >
                        <span>{w.name}</span>
                        <span className="font-mono text-2xs text-ink-500">
                          #{w.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSelectWorkerToInvite(w)}
                          aria-label={`Remove ${w.name}`}
                          className="text-ink-400 hover:text-brick cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Worker IDs Input */}
              <div>
                <label
                  htmlFor="wb-manual-worker-ids"
                  className="block text-xs font-semibold text-ink mb-1"
                >
                  Or Enter Worker ID(s) Directly
                </label>
                <input
                  id="wb-manual-worker-ids"
                  type="text"
                  value={manualWorkerIdsInput}
                  onChange={(e) => setManualWorkerIdsInput(e.target.value)}
                  placeholder="e.g. 18, 42, 105"
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-mono text-ink placeholder:text-ink-400 focus:border-sienna focus:outline-hidden focus:ring-1 focus:ring-sienna"
                />
                <p className="text-2xs text-ink-400 mt-1">
                  Separate multiple worker IDs with commas or spaces.
                </p>
              </div>

              {/* Last Invite Dispatch Summary & Generated Links */}
              {lastInviteResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-950">
                      {lastInviteResult.message}
                    </span>
                    <div className="flex items-center gap-2 text-2xs font-mono">
                      <span className="rounded bg-white px-2 py-0.5 border border-ink-200 text-ink-700">
                        Total: {lastInviteResult.total}
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900 font-semibold">
                        Sent: {lastInviteResult.sentCount}
                      </span>
                      {lastInviteResult.skippedCount > 0 && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900 font-semibold">
                          Skipped: {lastInviteResult.skippedCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {lastInviteResult.sent.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-2xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
                        Dispatched Invites &amp; Links
                      </p>
                      <ul className="divide-y divide-emerald-200/60 rounded-lg border border-emerald-200 bg-white overflow-hidden text-xs">
                        {lastInviteResult.sent.map((item, idx) => (
                          <li
                            key={item.workerId || idx}
                            className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-ink">
                                  Worker #{item.workerId}
                                </span>
                                {item.email && (
                                  <span className="inline-flex items-center gap-1 text-2xs font-mono text-ink-600">
                                    <EnvelopeIcon className="h-3 w-3" />
                                    {item.email}
                                  </span>
                                )}
                              </div>
                              {item.inviteUrl && (
                                <p className="text-2xs font-mono text-ink-500 truncate max-w-md mt-0.5">
                                  {item.inviteUrl}
                                </p>
                              )}
                            </div>
                            {item.inviteUrl && (
                              <button
                                type="button"
                                onClick={() => handleCopyInviteUrl(item.inviteUrl)}
                                className="inline-flex items-center gap-1 self-start sm:self-center rounded-md border border-ink-200 bg-ink-50 hover:bg-ink-100 px-2.5 py-1 text-2xs font-mono font-semibold text-ink shrink-0 cursor-pointer"
                              >
                                {copiedInviteUrl === item.inviteUrl ? (
                                  <>
                                    <CheckIcon className="h-3.5 w-3.5 text-forest" />
                                    Copied Link
                                  </>
                                ) : (
                                  <>
                                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                    Copy Invite Link
                                  </>
                                )}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {lastInviteResult.skipped.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-2xs font-mono uppercase tracking-wider text-amber-800 font-semibold">
                        Skipped ({lastInviteResult.skipped.length})
                      </p>
                      <ul className="text-2xs text-amber-900 space-y-0.5 font-mono">
                        {lastInviteResult.skipped.map((sk, i) => (
                          <li key={sk.workerId || i}>
                            Worker #{sk.workerId}: {sk.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-lg border border-ink-200 px-4 py-2 text-xs font-medium text-ink hover:bg-ink-50 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleInviteAllEligible(modalFilteredEligible)}
                  disabled={
                    sendingInvites || modalFilteredEligible.length === 0
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sienna bg-sienna/10 px-4 py-2 text-xs font-semibold text-sienna hover:bg-sienna/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {sendingInvites
                    ? "Sending..."
                    : `Invite All (${modalFilteredEligible.length})`}
                </button>
                <button
                  type="button"
                  onClick={handleSendInvitesSubmit}
                  disabled={
                    sendingInvites ||
                    (selectedToInvite.length === 0 && !manualWorkerIdsInput.trim())
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sienna px-4 py-2 text-xs font-semibold text-white hover:bg-sienna-dark transition disabled:opacity-50 cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {sendingInvites
                    ? "Sending Invites..."
                    : selectedToInvite.length > 0
                      ? `Invite Selected (${selectedToInvite.length})`
                      : "Send Invites"}
                </button>
              </div>
            </div>
          </GenericModal>
        )}
    </>
  );
}
