import { useState, useEffect, useRef, useMemo } from "react";
import {
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";

const PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This week", value: "thisWeek" },
  { label: "This month", value: "thisMonth" },
  { label: "Custom range...", value: "custom" },
];

function getPresetDates(preset) {
  const now = new Date();
  switch (preset) {
    case "today":
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
      };
    }
    case "thisWeek":
      return {
        startDate: startOfWeek(now, { weekStartsOn: 0 }),
        endDate: endOfWeek(now, { weekStartsOn: 0 }),
      };
    case "thisMonth":
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    default:
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
  }
}

export default function DateRangeFilter({
  onDateRangeChange,
  defaultRange = "today",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(defaultRange);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const initialDates = useMemo(() => getPresetDates(defaultRange), [defaultRange]);
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);

  const [customStart, setCustomStart] = useState(initialDates.startDate);
  const [customEnd, setCustomEnd] = useState(initialDates.endDate);

  const containerRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCustomPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync date selection with callback
  useEffect(() => {
    onDateRangeChange?.({ startDate, endDate });
  }, [startDate, endDate, onDateRangeChange]);

  const selectPreset = (preset) => {
    if (preset === "custom") {
      setCustomStart(startDate);
      setCustomEnd(endDate);
      setShowCustomPicker(true);
    } else {
      setActivePreset(preset);
      const dates = getPresetDates(preset);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      setStartDate(customStart);
      setEndDate(customEnd);
      setActivePreset("custom");
      setIsOpen(false);
      setShowCustomPicker(false);
    }
  };

  const getTriggerLabel = () => {
    if (activePreset === "today") return "Date: Today";
    if (activePreset === "yesterday") return "Date: Yesterday";
    if (activePreset === "thisWeek") return "Date: This Week";
    if (activePreset === "thisMonth") return "Date: This Month";
    return `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full sm:w-auto rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-800 shadow-sm hover:bg-cream-100 focus:outline-none focus:ring-2 focus:ring-black/10 transition"
      >
        <svg
          className="mr-2 h-4 w-4 text-ink-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="truncate">{getTriggerLabel()}</span>
        <svg
          className="ml-2.5 h-3.5 w-3.5 text-ink-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 origin-top-left rounded-lg bg-white shadow-lg border border-ink-150 focus:outline-none z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {!showCustomPicker ? (
            <div className="p-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => selectPreset(preset.value)}
                  className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-md transition ${
                    activePreset === preset.value
                      ? "bg-black text-white font-medium"
                      : "text-ink-700 hover:bg-cream-100"
                  }`}
                >
                  <span>{preset.label}</span>
                  {activePreset === preset.value && (
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Custom Picker Header */}
              <div className="flex items-center gap-2 border-b border-ink-100 pb-2">
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(false)}
                  className="p-1 rounded hover:bg-cream-100 text-ink-600 transition"
                  title="Back"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Custom Range</span>
              </div>

              {/* Custom Datepicker inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink-400 uppercase tracking-wide mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStart ? format(customStart, "yyyy-MM-dd") : ""}
                    onChange={(e) => setCustomStart(e.target.value ? new Date(e.target.value + "T00:00:00") : null)}
                    max={customEnd ? format(customEnd, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
                    className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-400 uppercase tracking-wide mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEnd ? format(customEnd, "yyyy-MM-dd") : ""}
                    onChange={(e) => setCustomEnd(e.target.value ? new Date(e.target.value + "T00:00:00") : null)}
                    min={customStart ? format(customStart, "yyyy-MM-dd") : ""}
                    max={format(new Date(), "yyyy-MM-dd")}
                    className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition bg-white"
                  />
                </div>
              </div>

              {/* Custom Picker Footer */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-ink-700 bg-cream-200 rounded-md hover:bg-ink-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCustomApply}
                  disabled={!customStart || !customEnd || customStart > customEnd}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-black rounded-md hover:bg-ink-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
