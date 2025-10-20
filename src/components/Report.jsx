import React, { useEffect, useState } from "react";
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
        console.error("Failed to fetch attendance dates:", err);
      }
    }
    fetchDates();
  }, []);

  // 2️⃣ When a date is selected, fetch data for that date
  useEffect(() => {
    if (!selectedDate) return;
    exportAttendance(selectedDate)
      .then((res) => setData(res))
      .catch((err) => console.error(err));
  }, [selectedDate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">Attendance Report</h1>

      {/* Dropdown to select attendance date */}
      <div className="mb-6 w-64">
        <label
          htmlFor="attendanceDate"
          className="block text-gray-700 text-sm font-semibold mb-2"
        >
          Select Attendance Date
        </label>
        <select
          id="attendanceDate"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Choose a date --</option>
          {dates.map((date, idx) => (
            <option key={idx} value={date.attendancedate || date}>
              {date.attendancedate || date}
            </option>
          ))}
        </select>
      </div>

      {/* Show export only when data is available */}
      {data.length > 0 ? (
        <ExportButton data={data} />
      ) : selectedDate ? (
        <p className="text-gray-500">Loading....</p>
      ) : (
        <p className="text-gray-400">Please select a date above.</p>
      )}
    </div>
  );
}
