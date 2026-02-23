import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkers } from "../services/workers";
import { getUser } from "../utils/getUser";
import { splitWorkersByBirthday, parseBirthdateMonthDay } from "../utils/birthdayUtils";
import { format } from "date-fns";

function formatBirthdateDisplay(value) {
  if (value == null || String(value).trim() === "") return "Date not set";
  const md = parseBirthdateMonthDay(value);
  if (!md) return String(value).trim() || "Date not set";
  try {
    const d = new Date(2000, md.month - 1, md.day);
    if (isNaN(d.getTime())) return String(value).trim() || "Date not set";
    return format(d, "MMMM d");
  } catch {
    return String(value).trim() || "Date not set";
  }
}

/**
 * Compact widget showing workers with birthdays today and upcoming (next 30 days).
 * Fetches workers for the department and parses birthdate on the frontend (no birthday API).
 *
 * @param {Object} props
 * @param {string} props.department - Department name, team name, or "All"
 */
export default function BirthdayWidget({ department }) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const { data: workers, isLoading } = useQuery({
    queryKey: ["workersForBirthdays", department],
    queryFn: () => {
      const auth = getUser();
      const permissions = auth?.permissions ?? [];
      return fetchWorkers(department || "All", null, permissions);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: true,
  });

  const list = Array.isArray(workers) ? workers : [];
  const { today, upcoming } = splitWorkersByBirthday(list);
  const totalCount = today.length + upcoming.length;

  const renderWorker = (worker, index) => (
    <div
      key={worker.id || worker.workerId || index}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-sm font-semibold text-blue-700">
          {worker.firstname?.[0] || worker.fullname?.[0] || "?"}
          {worker.lastname?.[0] || ""}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {worker.firstname ? `${worker.firstname} ${worker.lastname}`.trim() : worker.fullname}
        </p>
        <p className="text-xs text-gray-500">
          {formatBirthdateDisplay(worker.birthday || worker.birthdate)}{" "}
          {worker.department && `- ${worker.department}`}
          {worker.daysUntil != null && ` (${worker.daysUntil} day${worker.daysUntil === 1 ? "" : "s"})`}
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Birthdays
        </h2>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
          {isLoading ? "..." : totalCount}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
                <div className="h-2 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : totalCount > 0 ? (
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {today.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Today</h4>
              <div className="space-y-2">
                {today.map((w, i) => renderWorker(w, i))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Upcoming (30 days)</h4>
              <div className="space-y-2">
                {(showAllUpcoming ? upcoming : upcoming.slice(0, 5)).map((w, i) =>
                  renderWorker(w, i)
                )}
                {upcoming.length > 5 && !showAllUpcoming && (
                  <button
                    type="button"
                    onClick={() => setShowAllUpcoming(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    +{upcoming.length - 5} more
                  </button>
                )}
                {upcoming.length > 5 && showAllUpcoming && (
                  <button
                    type="button"
                    onClick={() => setShowAllUpcoming(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No upcoming birthdays.
        </p>
      )}
    </div>
  );
}
