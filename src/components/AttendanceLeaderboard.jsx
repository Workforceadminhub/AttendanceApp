import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchTopPerformers } from "../services/workers";
import LoadingState from "./LoadingState";

/**
 * Displays top and bottom attendance performers for a department.
 * When `data` is provided (frontend-computed leaderboard), uses it and does not fetch.
 *
 * @param {Object} props
 * @param {string} props.department - Department name to filter by
 * @param {string} props.startDate - ISO date string for range start
 * @param {string} props.endDate - ISO date string for range end
 * @param {number} [props.limit=5] - Number of performers to show per section
 * @param {Object} [props.data] - Optional precomputed { topPerformers, bottomPerformers } (skips API)
 * @param {boolean} [props.isLoading] - Optional loading state when data is computed elsewhere
 */
export default function AttendanceLeaderboard({
  department,
  startDate,
  endDate,
  limit = 5,
  data: dataProp,
  isLoading: isLoadingProp,
}) {
  const { data: fetchedData, isLoading: isFetching } = useQuery({
    queryKey: ["leaderboard", department, startDate, endDate, limit],
    queryFn: () => fetchTopPerformers(department, startDate, endDate, limit),
    enabled: !!department && !!startDate && !!endDate && !dataProp,
  });

  const data = dataProp ?? fetchedData;
  const isLoading = dataProp != null ? isLoadingProp : isFetching;

  const topPerformers = data?.topPerformers ?? data?.top ?? [];
  const bottomPerformers = data?.bottomPerformers ?? data?.bottom ?? [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Attendance Leaderboard
        </h2>
        <LoadingState />
      </div>
    );
  }

  const renderTable = (title, performers, isTop) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            isTop ? "bg-green-500" : "bg-red-500"
          }`}
        />
        {title}
      </h3>
      {performers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="py-2 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-0">
                  Rank
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance %
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {performers.map((performer, index) => (
                <tr key={performer.id || index}>
                  <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                    {index + 1}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                    <Link
                      to={`/worker/${performer.id}/attendance`}
                      className="text-blue-600 hover:underline"
                    >
                      {performer.firstname} {performer.lastname}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                    <span
                      className={`font-semibold ${
                        isTop ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {performer.attendanceRate || "0%"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                    {performer.trend === "up" ? (
                      <span className="text-green-500">&#9650;</span>
                    ) : performer.trend === "down" ? (
                      <span className="text-red-500">&#9660;</span>
                    ) : (
                      <span className="text-gray-400">&#8212;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No data available.</p>
      )}
    </div>
  );

  const bothEmpty = topPerformers.length === 0 && bottomPerformers.length === 0;

  return (
    <div className="bg-white rounded-lg border shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Attendance Leaderboard
      </h2>
      {bothEmpty ? (
        <p className="text-sm text-gray-500">
          {dataProp != null
            ? "No worker-level attendance data for this month."
            : "Leaderboard data is not available for this month. It will appear when the backend is ready."}
        </p>
      ) : (
        <>
          {renderTable(`Top ${limit} Performers`, topPerformers, true)}
          {renderTable(`Bottom ${limit} Performers`, bottomPerformers, false)}
        </>
      )}
    </div>
  );
}
