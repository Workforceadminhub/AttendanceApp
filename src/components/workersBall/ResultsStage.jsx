import { EnvelopeIcon } from "@heroicons/react/24/outline";

export default function ResultsStage(props) {
  const {
    stage,
    transitionTo,
    searchResults,
    lastSearchedQuery,
    executeSearch,
    searchQuery,
    setSearchQuery,
    isSearching,
    handleSelectWorker,
  } = props;
  return (
    <>
            {stage === "results" && (
              <section className="wb26-panel space-y-4">
                <div className="qc-card p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => transitionTo("search", "backward")}
                      className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition cursor-pointer"
                    >
                      &larr; New Search
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded bg-ink-100 px-2.5 py-1 text-2xs font-mono uppercase tracking-tag text-ink-700 qc-num">
                      {searchResults.length}{" "}
                      {searchResults.length === 1 ? "Result" : "Results"}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">
                      Select your name for &ldquo;{lastSearchedQuery}&rdquo;
                    </h2>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Tap your record. We&rsquo;ll email you a 6-digit code to
                      confirm it&rsquo;s you.
                    </p>
                  </div>

                  {/* Inline quick refine search */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      executeSearch();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      aria-label="Search another name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search another name..."
                      autoCorrect="off"
                      spellCheck={false}
                      className="qc-input min-h-0 py-2 text-sm flex-1"
                    />
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="qc-btn-secondary min-h-0 py-2 px-4 text-xs font-mono uppercase tracking-tag cursor-pointer"
                    >
                      {isSearching ? "..." : "Search"}
                    </button>
                  </form>
                </div>

                {searchResults.length === 0 ? (
                  <div className="qc-card p-6 text-center space-y-1.5">
                    <p className="text-sm font-semibold text-ink-900">
                      No workers found for &ldquo;{lastSearchedQuery}&rdquo;
                    </p>
                    <p className="text-xs text-ink-500">
                      Try your first name only, or check the spelling. If you
                      still can&rsquo;t find yourself, speak to your HOD.
                    </p>
                  </div>
                ) : (
                  <ul
                    className="divide-y divide-ink-200 rounded-md border border-ink-200 bg-white overflow-hidden shadow-sheet"
                    aria-label="Matching workers"
                  >
                    {searchResults.map((w, index) => {
                      const deptTeamLine = [w.department, w.team]
                        .filter(Boolean)
                        .join(" · ");

                      return (
                        <li
                          key={w.id}
                          className="wb26-stagger-item"
                          style={{ "--stagger-index": index }}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectWorker(w)}
                            className="group w-full text-left px-4 sm:px-5 py-3.5 hover:bg-cream transition flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span className="font-mono qc-num text-xs font-semibold text-ink-400 group-hover:text-sienna w-6 shrink-0">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-ink-900 truncate">
                                    {w.name || `${w.firstName} ${w.lastName}`}
                                  </p>
                                  {w.phone && (
                                    <span className="text-xs font-mono qc-num text-ink-500">
                                      {w.phone}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-ink-500 truncate mt-0.5">
                                  {deptTeamLine || "Workforce Member"}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                              {w.registered ? (
                                <span className="inline-flex items-center gap-1 rounded bg-forest-50 px-2 py-0.5 text-2xs font-mono font-medium text-forest">
                                  ✓ Registered
                                </span>
                              ) : w.email ? (
                                <span className="inline-flex items-center gap-1 rounded bg-cream-200 px-2 py-0.5 text-2xs font-mono font-medium text-ink-700">
                                  <EnvelopeIcon className="h-3 w-3" />
                                  {w.email}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-sienna-50 px-2 py-0.5 text-2xs font-mono font-medium text-sienna">
                                  + Add Email
                                </span>
                              )}
                              <span
                                className="hidden sm:inline-block text-ink-400 group-hover:text-ink-900 group-hover:translate-x-0.5 transition-transform ml-1"
                                aria-hidden="true"
                              >
                                &rarr;
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
    </>
  );
}
