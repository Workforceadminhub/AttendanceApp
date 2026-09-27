import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "./Layout";
import ExportButton from "./ExportButton";
import { exportAttendance } from "../services/exportAttendance";
import { useHistoryDates } from "../hooks/useAttendanceQueries";

export default function Report() {
  const [selectedDate, setSelectedDate] = useState("");

  // Dates shared (and cached) with the history pages; each export is cached
  // per date, so switching back to a date doesn't download it again.
  const { data: dates = [] } = useHistoryDates();
  const { data = [] } = useQuery({
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
            <div className="mb-5 w-full sm:max-w-xs">
              <label htmlFor="attendanceDate" className="qc-label">
                Attendance date
              </label>
              <select
                id="attendanceDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="qc-input"
              >
                <option value="">- Choose a date -</option>
                {dates.map((date, idx) => (
                  <option key={idx} value={date.attendancedate || date}>
                    {date.attendancedate || date}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-ink-200">
              {data.length > 0 ? (
                <ExportButton data={data} />
              ) : selectedDate ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : (
                <p className="text-sm text-ink-400">
                  Select a date above to enable export.
                </p>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
