import React, { useEffect, useState } from "react";
import Header from "./Header";
import Layout from "./Layout";
import ExportButton from "./ExportButton";
import { exportAttendance } from "../services/exportAttendance";
import apiRequest from "../utils/apiClient";

export default function Report() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [data, setData] = useState([]);

  // 1️⃣ Fetch available attendance dates on mount
  useEffect(() => {
    async function fetchDates() {
      try {
        const res = await apiRequest("GET","/api/uniquedates");
        const result = res.data
        setDates(result || []);
      } catch (err) {
      }
    }
    fetchDates();
  }, []);

  // 2️⃣ When a date is selected, fetch data for that date
  useEffect(() => {
    if (!selectedDate) return;
    exportAttendance(selectedDate)
      .then((res) => setData(res))
      .catch(() => {});
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-cream">
      <Header />
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
