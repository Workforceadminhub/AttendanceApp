import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchInactiveWorkers } from "../services/workers";

/**
 * Widget showing workers with attendance below threshold.
 *
 * @param {Object} props
 * @param {string} props.department - Department name, team name, or "All"
 * @param {number} [props.threshold=60] - Attendance percentage threshold (workers below this are inactive)
 */
export default function InactiveWorkersWidget({ department, threshold = 60 }) {
 const { data, isLoading } = useQuery({
 queryKey: ["inactiveWorkers", department, threshold],
 queryFn: () => fetchInactiveWorkers(department, threshold),
 staleTime: 10 * 60 * 1000, // 10 minutes
 });

 const inactiveWorkers = data?.inactiveWorkers ?? (Array.isArray(data) ? data : []);
 const count = data?.count ?? inactiveWorkers.length;
 const displayThreshold = data?.threshold ?? threshold;

 return (
 <div className="bg-white rounded-lg border shadow p-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-ink-900">
 Inactive Workers
 </h2>
 <span className="inline-flex items-center rounded-full bg-brick/10 px-2 py-1 text-xs font-medium text-brick">
 {isLoading ? "..." : count}
 </span>
 </div>
 <p className="text-xs text-ink-500 mb-4">
 Workers with attendance below {displayThreshold}%
 </p>

 {isLoading ? (
 <div className="space-y-3">
 {[1, 2, 3].map((i) => (
 <div key={i} className="animate-pulse flex items-center gap-3">
 <div className="flex-1">
 <div className="h-3 bg-ink-200 rounded w-3/4 mb-1" />
 <div className="h-2 bg-ink-200 rounded w-1/2" />
 </div>
 <div className="h-3 bg-ink-200 rounded w-16" />
 </div>
 ))}
 </div>
 ) : inactiveWorkers.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-ink-200">
 <thead>
 <tr>
 <th className="py-2 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Name
 </th>
 <th className="py-2 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Last Seen
 </th>
 <th className="py-2 text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
 Rate / Days
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-ink-100">
 {inactiveWorkers.slice(0, 15).map((worker, index) => (
 <tr key={worker.id || index}>
 <td className="py-2 text-sm">
 <Link
 to={`/worker/${worker.id}/attendance`}
 className="text-ink-900 hover:underline"
 >
 {worker.firstname} {worker.lastname}
 </Link>
 {worker.department && (
 <p className="text-xs text-ink-400">{worker.department}</p>
 )}
 </td>
 <td className="py-2 text-sm text-ink-500">
 {worker.lastAttendance ?? worker.lastAttendanceDate ?? "Never"}
 </td>
 <td className="py-2 text-sm">
 <span
 className={`font-medium ${
 (worker.daysInactive ?? worker.attendanceRate) > 60
 ? "text-brick"
 : (worker.daysInactive ?? worker.attendanceRate) > 30
 ? "text-mustard"
 : "text-ink-600"
 }`}
 >
 {worker.daysInactive ?? worker.attendanceRate ?? "-"}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {inactiveWorkers.length > 15 && (
 <p className="mt-2 text-xs text-ink-500 text-center">
 Showing 15 of {inactiveWorkers.length} inactive workers
 </p>
 )}
 </div>
 ) : (
 <p className="text-sm text-ink-500">
 No inactive workers found. Great job!
 </p>
 )}
 </div>
 );
}
