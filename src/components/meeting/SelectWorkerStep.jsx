import { useState } from "react";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { BackButton, inputClass } from "./atoms";
import { runWorkerSearch, searchButtonClass } from "./NameSearchStep";

const addNewButtonClass =
  "w-full inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-cream";

function StatusBadge({ worker, mode }) {
  const confirmed = worker.isConfirmed === true || worker.is_confirmed === true;
  const declined = worker.isConfirmed === false || worker.is_confirmed === false;
  const present = worker.isPresent === true || worker.is_present === true;

  if (mode === "present" && present) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        Present
      </span>
    );
  }
  if (mode === "confirm" && confirmed) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        Confirmed
      </span>
    );
  }
  if (declined) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sienna-50 px-2.5 py-0.5 text-xs font-medium text-sienna">
        <XCircleIcon className="h-3.5 w-3.5" />
        Not Attending
      </span>
    );
  }
  return null;
}

/**
 * Step 2: pick yourself from the search results (or retry / add yourself).
 *
 * @param {"confirm"|"present"} props.mode  which status badge to show; "present" also
 *   offers "Add yourself" beneath a non-empty result list.
 */
export default function SelectWorkerStep({
  workers,
  searchedName,
  onSelect,
  onBack,
  onRetrySearch,
  onAddNew,
  token = null,
  meetingDate,
  meetingType,
  mode = "confirm",
}) {
  const [retryName, setRetryName] = useState(searchedName);
  const [isSearching, setIsSearching] = useState(false);

  const handleRetry = () =>
    runWorkerSearch({
      name: retryName,
      token,
      meetingDate,
      meetingType,
      onResults: onRetrySearch,
      setIsSearching,
    });

  const addNewButton = (
    <button type="button" onClick={() => onAddNew(searchedName)} className={addNewButtonClass}>
      <PlusCircleIcon className="h-4 w-4" />
      Add yourself as a new worker
    </button>
  );

  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />

      {workers.length === 0 ? (
        <div className="rounded-lg border border-ink-200 bg-ink-100 p-6 space-y-4">
          <div className="text-center space-y-2">
            <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-ink-400" />
            <p className="text-sm font-medium text-ink">
              No results for &ldquo;{searchedName}&rdquo;
            </p>
            <p className="text-xs text-ink-500">
              Check the spelling and try again, or add yourself as a new worker.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="Search again by name"
              value={retryName}
              onChange={(e) => setRetryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRetry();
              }}
              placeholder="e.g. Mayowa Agboade"
              className={`flex-1 ${inputClass}`}
              disabled={isSearching}
              autoFocus
            />
            <button
              type="button"
              onClick={handleRetry}
              disabled={isSearching || !retryName.trim()}
              className={searchButtonClass}
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              {isSearching ? "Searching..." : "Try Again"}
            </button>
          </div>
          <div className="border-t border-ink-200 pt-4">{addNewButton}</div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium text-ink mb-1">
              {workers.length} result{workers.length !== 1 ? "s" : ""} found
            </p>
            <p className="text-xs text-ink-500 mb-3">Select your name from the list below.</p>
          </div>

          <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200 overflow-hidden">
            {workers.map((w) => {
              const sub = [w.department, w.team].filter(Boolean).join(" · ");
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(w)}
                    className="w-full text-left px-4 py-3 hover:bg-ink-100 transition flex items-center gap-3"
                  >
                    <UserCircleIcon className="h-8 w-8 text-ink-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{w.name || "-"}</p>
                      {sub && <p className="text-xs text-ink-500 truncate">{sub}</p>}
                    </div>
                    <StatusBadge worker={w} mode={mode} />
                  </button>
                </li>
              );
            })}
          </ul>

          {mode === "present" && <div className="pt-2">{addNewButton}</div>}
        </>
      )}
    </div>
  );
}
