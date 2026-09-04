import { useState } from "react";
import { toast } from "react-toastify";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { searchMeetingWorkers } from "../../services/meeting";
import { Label, inputClass } from "./atoms";

export const searchButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

/**
 * Runs a worker name search for the given meeting and reports the list back.
 * Shared by the initial search step and the "try again" retry inside SelectWorkerStep.
 */
export async function runWorkerSearch({ name, token, meetingDate, meetingType, onResults, setIsSearching }) {
  const trimmed = name.trim();
  if (!trimmed) {
    toast.error("Please enter a name to search.");
    return;
  }
  setIsSearching(true);
  try {
    const results = await searchMeetingWorkers(trimmed, token, meetingDate, meetingType);
    onResults(Array.isArray(results) ? results : [], trimmed);
  } catch (err) {
    toast.error(err.message || "Search failed. Please try again.");
  } finally {
    setIsSearching(false);
  }
}

/**
 * Step 1: find yourself by name.
 *
 * @param {object} props
 * @param {(workers: object[], name: string) => void} props.onResults
 * @param {string|null} props.token
 * @param {string} props.meetingDate   YYYY-MM-DD
 * @param {"leaders"|"workers"} props.meetingType
 * @param {string} [props.hint]        helper copy under the label
 */
export default function NameSearchStep({ onResults, token = null, meetingDate, meetingType, hint }) {
  const [name, setName] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () =>
    runWorkerSearch({ name, token, meetingDate, meetingType, onResults, setIsSearching });

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="search-name" required>
          Your Full Name
        </Label>
        {hint && <p className="text-xs text-ink-500 mb-2">{hint}</p>}
        <div className={`flex gap-2${hint ? "" : " mt-2"}`}>
          <input
            id="search-name"
            type="text"
            placeholder="e.g. Mayowa Agboade"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className={`flex-1 ${inputClass}`}
            disabled={isSearching}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !name.trim()}
            className={searchButtonClass}
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            {isSearching ? "Searching..." : "Find Me"}
          </button>
        </div>
      </div>
    </div>
  );
}
