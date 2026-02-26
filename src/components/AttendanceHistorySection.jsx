import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAttendanceHistory } from "../services/attendance";
import { getSundaysInYear, getNextSunday } from "../utils/getDate";
import LoadingState from "./LoadingState";

/**
 * Parse "Sunday - d/m/y" → "yyyy-MM-dd" (used only for sorting/cutoff,
 * NOT for the API call — the backend expects the original Sunday string format).
 */
function sundayToISO(dateStr) {
  if (!dateStr || !/^Sunday - \d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return null;
  const parts = dateStr.split(" - ")[1].split("/");
  const day = String(parseInt(parts[0], 10)).padStart(2, "0");
  const month = String(parseInt(parts[1], 10)).padStart(2, "0");
  const year = parts[2];
  return `${year}-${month}-${day}`;
}

/** Format "Sunday - d/m/y" → "Sun 2 Mar 2026" for dropdown display */
function formatSundayLabel(sundayStr) {
  const iso = sundayToISO(sundayStr);
  if (!iso) return sundayStr;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Displays attendance history for a selected past Sunday.
 * A single dropdown lists all past Sundays (most recent first).
 *
 * @param {Object} props
 * @param {string[]} props.permissions - Array of department names the user has access to
 */
export default function AttendanceHistorySection({ permissions }) {
  // Build list of all past Sundays (including current) in descending order.
  // Values are the original "Sunday - d/m/y" strings — the backend expects this format.
  const sundayOptions = useMemo(() => {
    const allSundays = getSundaysInYear(2026);
    const cutoff = sundayToISO(getNextSunday()) || "";
    return allSundays
      .filter((s) => {
        const iso = sundayToISO(s);
        return iso && iso <= cutoff;
      })
      .sort((a, b) => {
        // Sort descending by ISO equivalent (most recent first)
        const isoA = sundayToISO(a) || "";
        const isoB = sundayToISO(b) || "";
        return isoB.localeCompare(isoA);
      });
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => sundayOptions[0] || "");

  const { data: records = [], isLoading, isFetching } = useQuery({
    queryKey: ["attendanceHistory", permissions, selectedDate],
    queryFn: () => fetchAttendanceHistory(permissions, selectedDate, selectedDate),
    enabled:
      Array.isArray(permissions) &&
      permissions.length > 0 &&
      !!selectedDate,
    keepPreviousData: true,
  });

  // Detect record shape: summary (present/absent aggregates) vs individual worker records
  const isSummaryShape = useMemo(() => {
    if (!records.length) return false;
    const first = records[0];
    return (
      first.present !== undefined ||
      first.absent !== undefined ||
      first.total !== undefined
    );
  }, [records]);

  const isWorkerShape = useMemo(() => {
    if (!records.length) return false;
    const first = records[0];
    return (
      first.firstname !== undefined ||
      first.lastname !== undefined ||
      first.fullname !== undefined ||
      first.workerName !== undefined
    );
  }, [records]);

  const renderSummaryTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-0">
              Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Present
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Absent
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {records.map((row, i) => {
            const present = row.present ?? 0;
            const absent = row.absent ?? 0;
            const total = row.total ?? present + absent;
            const pct = total > 0 ? `${Math.round((present / total) * 100)}%` : "—";
            const date =
              row.date ?? row.attendancedate ?? row.attendanceDate ?? "—";
            const dept =
              row.department ?? row.department_name ?? row.departmentName ?? "—";
            return (
              <tr key={i}>
                <td className="whitespace-nowrap py-3 pl-4 pr-3 text-gray-900 sm:pl-0">
                  {date}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                  {dept}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                  {total}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-green-600">
                  {present}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-red-500">
                  {absent}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                  {pct}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderWorkerTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-0">
              Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {records.map((row, i) => {
            const date =
              row.date ?? row.attendancedate ?? row.attendanceDate ?? "—";
            const name =
              (row.fullname ??
              row.workerName ??
              `${row.firstname ?? ""} ${row.lastname ?? ""}`.trim()) ||
              "—";
            const dept =
              row.department ?? row.department_name ?? row.departmentName ?? "—";
            const status = row.attendance ?? row.status ?? "—";
            const presentStatuses = new Set(["present", "online"]);
            const statusLower = (status || "").toString().toLowerCase();
            const statusColor = presentStatuses.has(statusLower)
              ? "text-green-600"
              : statusLower === "absent"
              ? "text-red-500"
              : "text-gray-600";
            return (
              <tr key={i}>
                <td className="whitespace-nowrap py-3 pl-4 pr-3 text-gray-900 sm:pl-0">
                  {date}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-800">
                  {name}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                  {dept}
                </td>
                <td className={`whitespace-nowrap px-3 py-3 font-medium ${statusColor}`}>
                  {status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Generic fallback: render key-value pairs for unknown shapes
  const renderGenericTable = () => {
    if (!records.length) return null;
    const keys = Object.keys(records[0]);
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {keys.map((k) => (
                <th
                  key={k}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider first:pl-0"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {records.map((row, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td
                    key={k}
                    className="whitespace-nowrap px-3 py-3 text-gray-600 first:pl-0"
                  >
                    {String(row[k] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const loading = isLoading || isFetching;

  return (
    <div className="mt-6 bg-white rounded-lg border shadow p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Attendance History
        </h2>

        {/* Sunday selector */}
        {sundayOptions.length > 0 && (
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sundayOptions.map((sundayStr) => (
              <option key={sundayStr} value={sundayStr}>
                {formatSundayLabel(sundayStr)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Results — only rendered when data is available */}
      {loading ? (
        <LoadingState />
      ) : records.length > 0 ? (
        <>
          {isSummaryShape
            ? renderSummaryTable()
            : isWorkerShape
            ? renderWorkerTable()
            : renderGenericTable()}
          <p className="mt-3 text-xs text-gray-400">
            {records.length} record{records.length !== 1 ? "s" : ""} found
          </p>
        </>
      ) : null}
    </div>
  );
}
