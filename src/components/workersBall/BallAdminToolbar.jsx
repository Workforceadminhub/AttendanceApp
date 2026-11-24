import { PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function BallAdminToolbar(props) {
  const {
    handleStatusChange,
    statusFilter,
    allRegistrations,
    eligibleLoaded,
    loadingEligible,
    loadEligible,
    eligibleWorkers,
    totalAttendedCount,
    totalAwaitingCount,
    totalPendingCount,
    activeRows,
    isEligibleTab,
    hasActiveFilters,
    clearFilters,
    search,
    handleSearchChange,
    departmentFilter,
    handleDepartmentChange,
    departmentOptions,
    teamFilter,
    handleTeamChange,
    teamOptions,
    handleToggleSelectAllEligible,
    filteredEligible,
    isWorkerSelected,
    selectedToInvite,
    setSelectedToInvite,
    handleInviteSelectedEligible,
    sendingInvites,
    handleInviteAllEligible,
  } = props;
  return (
    <>
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-xs space-y-4">
          {/* Top Row: Status Tabs & Result Count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-ink-100 pb-3">
            <div className="inline-flex flex-wrap rounded-lg bg-ink-100/80 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleStatusChange("all")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "all"
                    ? "bg-white text-ink shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>All</span>
                <span className="rounded-full bg-ink-100 px-1.5 py-0.2 text-2xs text-ink-700">
                  {allRegistrations.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleStatusChange("eligible");
                  if (!eligibleLoaded && !loadingEligible) {
                    void loadEligible(false);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "eligible"
                    ? "bg-sienna text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>Eligible</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "eligible"
                      ? "bg-sienna-dark text-white"
                      : "bg-sienna/15 text-sienna"
                  }`}
                >
                  {eligibleWorkers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("attended")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "attended"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>Attended</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "attended"
                      ? "bg-emerald-700 text-emerald-100"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {totalAttendedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("registered")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "registered"
                    ? "bg-ink-800 text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>Registered</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "registered"
                      ? "bg-ink-900 text-ink-100"
                      : "bg-ink-100 text-ink-800"
                  }`}
                >
                  {totalAwaitingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("pending")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  statusFilter === "pending"
                    ? "bg-amber-600 text-white shadow-xs font-semibold"
                    : "text-ink-600 hover:text-ink"
                }`}
              >
                <span>Pending</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    statusFilter === "pending"
                      ? "bg-amber-700 text-amber-100"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {totalPendingCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-ink-500">
              <span>
                <strong className="text-ink">{activeRows.length}</strong> of{" "}
                {isEligibleTab ? eligibleWorkers.length : allRegistrations.length}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-brick hover:underline ml-2"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Multi-Field Search & Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <input
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search name, code, email, phone..."
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink placeholder:text-ink-400 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>

            {/* Department Dropdown */}
            <div>
              <select
                aria-label="Filter by Department"
                value={departmentFilter}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
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
            </div>

            {/* Team Dropdown */}
            <div>
              <select
                aria-label="Filter by Team"
                value={teamFilter}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition"
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
          </div>

          {/* Bulk Invite Action Bar on Eligible Tab */}
          {isEligibleTab && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-ink-100">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllEligible(filteredEligible)}
                  disabled={filteredEligible.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink-50 disabled:opacity-50 transition cursor-pointer"
                >
                  {filteredEligible.length > 0 &&
                  filteredEligible.every((w) => isWorkerSelected(w))
                    ? "Deselect All"
                    : `Select All (${filteredEligible.length})`}
                </button>

                {selectedToInvite.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedToInvite([])}
                    className="text-xs font-medium text-brick hover:underline px-2 py-1 cursor-pointer"
                  >
                    Clear Selection ({selectedToInvite.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleInviteSelectedEligible}
                  disabled={sendingInvites || selectedToInvite.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-xs font-semibold text-cream hover:bg-ink-900 disabled:opacity-50 transition cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {sendingInvites
                    ? "Sending..."
                    : `Invite Selected (${selectedToInvite.length})`}
                </button>

                <button
                  type="button"
                  onClick={() => handleInviteAllEligible(filteredEligible)}
                  disabled={sendingInvites || filteredEligible.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sienna px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sienna-dark disabled:opacity-50 transition cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  {sendingInvites
                    ? "Sending..."
                    : `Invite All (${filteredEligible.length})`}
                </button>
              </div>
            </div>
          )}
        </div>
    </>
  );
}
