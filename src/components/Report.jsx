import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Layout from "./Layout";
import ExportButton from "./ExportButton";
import { exportAttendance } from "../services/exportAttendance";
import { getUserRole } from "../utils/getUserRole";
import { getPostLoginPath } from "../utils/routeObject";
import { getMonthSundaysThrough } from "../utils/getDate";

// Attendance records start in 2025.
const FIRST_YEAR = 2025;
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString("en-GB", { month: "long" })
);

export default function Report() {
  const { isSuperAdmin, isChurchAdmin, user } = getUserRole();
  if (!isSuperAdmin && !isChurchAdmin) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }
  return <ReportContent />;
}

function ReportContent() {
  const [lastSunday] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay());
    return date;
  });
  const lastYear = lastSunday.getFullYear();
  const lastMonth = lastSunday.getMonth();

  const [year, setYear] = useState(lastYear);
  const [month, setMonth] = useState(lastMonth);
  const [selectedDate, setSelectedDate] = useState("");

  const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, i) => lastYear - i);
  const months = year === lastYear ? MONTHS.slice(0, lastMonth + 1) : MONTHS;
  const sundays = useMemo(
    () =>
      getMonthSundaysThrough(
        year === lastYear && month === lastMonth ? lastSunday : new Date(year, month + 1, 0)
      ),
    [year, month, lastYear, lastMonth, lastSunday]
  );

  const changeYear = (nextYear) => {
    setYear(nextYear);
    if (nextYear === lastYear) setMonth((m) => Math.min(m, lastMonth));
    setSelectedDate("");
  };
  const changeMonth = (nextMonth) => {
    setMonth(nextMonth);
    setSelectedDate("");
  };

  // Each export is cached per date, so switching back to a date doesn't
  // download it again.
  const { data = [], isFetching, isError } = useQuery({
    queryKey: ["attendanceExport", selectedDate],
    queryFn: () => exportAttendance(selectedDate),
    enabled: Boolean(selectedDate),
  });

  return (
    <div className="min-h-screen bg-cream">
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="qc-eyebrow">Reports</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
              Attendance report
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Pick a Sunday to export the attendance roll.
            </p>
          </div>

          <div className="qc-card p-5 sm:p-6">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-sm">
              <div>
                <label htmlFor="reportMonth" className="qc-label">
                  Month
                </label>
                <select
                  id="reportMonth"
                  value={month}
                  onChange={(e) => changeMonth(Number(e.target.value))}
                  className="qc-input"
                >
                  {months.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reportYear" className="qc-label">
                  Year
                </label>
                <select
                  id="reportYear"
                  value={year}
                  onChange={(e) => changeYear(Number(e.target.value))}
                  className="qc-input"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-5">
              <div id="reportSunday" className="qc-label">
                Sunday
              </div>
              <div role="group" aria-labelledby="reportSunday" className="flex flex-wrap gap-2">
                {sundays.map((date) => {
                  // The API expects "Sunday - d/m/yyyy".
                  const value = `Sunday - ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                  const isSelected = selectedDate === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedDate(value)}
                      className={`${isSelected ? "qc-btn-primary" : "qc-btn-secondary"} tabular-nums`}
                    >
                      {format(date, "d MMM yyyy")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-ink-200" aria-live="polite">
              {data.length > 0 ? (
                <ExportButton data={data} />
              ) : !selectedDate ? (
                <p className="text-sm text-ink-400">
                  Select a Sunday above to enable export.
                </p>
              ) : isFetching ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : isError ? (
                <p className="text-sm text-ink-500">
                  Could not load attendance for this date.
                </p>
              ) : (
                <p className="text-sm text-ink-500">
                  No attendance recorded for this date.
                </p>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
