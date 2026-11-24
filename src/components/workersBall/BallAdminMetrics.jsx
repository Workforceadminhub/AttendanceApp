

export default function BallAdminMetrics(props) {
  const {
    loading,
    totalRegisteredCount,
    totalAttendedCount,
    totalPendingCount,
    checkinRate,
  } = props;
  return (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Registered (Confirmed) */}
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-500">
              Registered
            </span>
            <div className="mt-3 text-3xl font-extrabold text-ink tracking-tight">
              {loading ? "..." : totalRegisteredCount.toLocaleString()}
            </div>
          </div>

          {/* Attended */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
              Attended
            </span>
            <div className="mt-3 text-3xl font-extrabold text-emerald-950 tracking-tight">
              {loading ? "..." : totalAttendedCount.toLocaleString()}
            </div>
          </div>

          {/* Pending Confirmation */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-800 font-semibold">
              Pending
            </span>
            <div className="mt-3 text-3xl font-extrabold text-amber-950 tracking-tight">
              {loading ? "..." : totalPendingCount.toLocaleString()}
            </div>
          </div>

          {/* Turnout */}
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-500">
                Turnout
              </span>
              <span className="text-xs font-bold font-mono text-ink-700">
                {checkinRate}%
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-ink tracking-tight">
              {loading ? "..." : `${checkinRate}%`}
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, checkinRate))}%` }}
              />
            </div>
          </div>
        </div>
    </>
  );
}
