import { useState, useCallback, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
 subMonths,
 startOfWeek,
 endOfWeek,
 startOfMonth,
 endOfMonth,
 startOfQuarter,
 endOfQuarter,
 format,
} from "date-fns";
import GenericModal from "./GenericModal";

const FILTER_CACHE_KEY = "dateRangeFilterCache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Preset date range options
 */
const PRESETS = [
 { label: "This week", value: "thisWeek" },
 { label: "This month", value: "thisMonth" },
 { label: "Last month", value: "lastMonth" },
 { label: "This quarter", value: "thisQuarter" },
 { label: "Custom", value: "custom" },
];

/**
 * Calculates start and end dates for a given preset
 */
function getPresetDates(preset) {
 const now = new Date();
 switch (preset) {
 case "thisWeek":
 return {
 startDate: startOfWeek(now, { weekStartsOn: 0 }),
 endDate: endOfWeek(now, { weekStartsOn: 0 }),
 };
 case "thisMonth":
 return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
 case "lastMonth": {
 const lastMonth = subMonths(now, 1);
 return {
 startDate: startOfMonth(lastMonth),
 endDate: endOfMonth(lastMonth),
 };
 }
 case "thisQuarter":
 return { startDate: startOfQuarter(now), endDate: endOfQuarter(now) };
 default:
 return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
 }
}

/**
 * Loads cached date range from localStorage
 */
function loadCachedDateRange() {
 try {
 const cached = localStorage.getItem(FILTER_CACHE_KEY);
 if (!cached) return null;

 const parsed = JSON.parse(cached);
 const now = Date.now();

 // Check TTL
 if (parsed.timestamp && now - parsed.timestamp < CACHE_TTL) {
 return {
 preset: parsed.preset,
 startDate: new Date(parsed.startDate),
 endDate: new Date(parsed.endDate),
 };
 }

 // Cache expired
 localStorage.removeItem(FILTER_CACHE_KEY);
 return null;
 } catch {
 return null;
 }
}

/**
 * Saves date range to localStorage cache
 */
function saveDateRangeCache(preset, startDate, endDate) {
 try {
 localStorage.setItem(
 FILTER_CACHE_KEY,
 JSON.stringify({
 preset,
 startDate: startDate.toISOString(),
 endDate: endDate.toISOString(),
 timestamp: Date.now(),
 })
 );
 } catch {
 // Silently fail if localStorage is unavailable
 }
}

/**
 * Global date range filter component.
 *
 * @param {Object} props
 * @param {Function} props.onDateRangeChange - Callback with { startDate, endDate } when range changes
 * @param {string} [props.defaultRange="thisMonth"] - Default preset range
 * @param {string} [props.className] - Additional CSS classes
 */
export default function DateRangeFilter({
 onDateRangeChange,
 defaultRange = "thisMonth",
 className = "",
}) {
 // Try to load from cache first (only use if preset still exists)
 const cached = loadCachedDateRange();
 const validPresets = PRESETS.map((p) => p.value);
 const initialPreset =
 cached?.preset && validPresets.includes(cached.preset)
 ? cached.preset
 : defaultRange;
 const initialDates = cached?.preset && validPresets.includes(cached.preset)
 ? { startDate: cached.startDate, endDate: cached.endDate }
 : getPresetDates(defaultRange);

 const [activePreset, setActivePreset] = useState(initialPreset);
 const [startDate, setStartDate] = useState(initialDates.startDate);
 const [endDate, setEndDate] = useState(initialDates.endDate);
 const [showCustomModal, setShowCustomModal] = useState(false);
 const [customStart, setCustomStart] = useState(initialDates.startDate);
 const [customEnd, setCustomEnd] = useState(initialDates.endDate);
 const [presetBeforeCustom, setPresetBeforeCustom] = useState("thisMonth");

 const handleDropdownChange = useCallback(
 (e) => {
 const preset = e.target.value;
 if (preset === "custom") {
 setPresetBeforeCustom(activePreset);
 setCustomStart(startDate);
 setCustomEnd(endDate);
 setShowCustomModal(true);
 setActivePreset("custom");
 } else {
 setActivePreset(preset);
 const dates = getPresetDates(preset);
 setStartDate(dates.startDate);
 setEndDate(dates.endDate);
 saveDateRangeCache(preset, dates.startDate, dates.endDate);
 if (onDateRangeChange) {
 onDateRangeChange({
 startDate: dates.startDate,
 endDate: dates.endDate,
 });
 }
 }
 },
 [activePreset, startDate, endDate, onDateRangeChange]
 );

 const handleCustomApply = useCallback(() => {
 if (customStart && customEnd && customStart <= customEnd) {
 setStartDate(customStart);
 setEndDate(customEnd);
 setActivePreset("custom");
 saveDateRangeCache("custom", customStart, customEnd);
 if (onDateRangeChange) {
 onDateRangeChange({ startDate: customStart, endDate: customEnd });
 }
 setShowCustomModal(false);
 }
 }, [customStart, customEnd, onDateRangeChange]);

 const handleCustomCancel = useCallback(() => {
 setShowCustomModal(false);
 setCustomStart(startDate);
 setCustomEnd(endDate);
 setActivePreset(presetBeforeCustom);
 }, [startDate, endDate, presetBeforeCustom]);

 // Sync parent when range or callback reference changes
 useEffect(() => {
 onDateRangeChange?.({ startDate, endDate });
 }, [startDate, endDate, onDateRangeChange]);

 return (
 <div className={`flex flex-wrap items-center gap-3 ${className}`}>
 {/* Dropdown */}
 <select
 value={activePreset}
 onChange={handleDropdownChange}
 className="rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
 >
 {PRESETS.map((preset) => (
 <option key={preset.value} value={preset.value}>
 {preset.label}
 </option>
 ))}
 </select>

 {/* Current range display - for "this week" show Sunday only */}
 <div className="text-sm text-ink-500">
 {activePreset === "thisWeek"
 ? format(startDate, "MMM d, yyyy")
 : `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`}
 </div>

 {/* Custom date range modal */}
 <GenericModal
 isOpen={showCustomModal}
 onClose={handleCustomCancel}
 title="Select date range"
 size="medium"
 >
 <div className="space-y-4">
 <div className="flex items-center gap-2">
 <DatePicker
 selected={customStart}
 onChange={(date) => setCustomStart(date)}
 selectsStart
 startDate={customStart}
 endDate={customEnd}
 maxDate={customEnd}
 dateFormat="MMM d, yyyy"
 className="rounded-md border border-ink-300 px-3 py-2 text-sm w-full focus:border-black focus:ring-1 focus:ring-black"
 placeholderText="Start date"
 />
 <span className="text-ink-500 text-sm shrink-0">to</span>
 <DatePicker
 selected={customEnd}
 onChange={(date) => setCustomEnd(date)}
 selectsEnd
 startDate={customStart}
 endDate={customEnd}
 minDate={customStart}
 maxDate={new Date()}
 dateFormat="MMM d, yyyy"
 className="rounded-md border border-ink-300 px-3 py-2 text-sm w-full focus:border-black focus:ring-1 focus:ring-black"
 placeholderText="End date"
 />
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={handleCustomCancel}
 className="px-4 py-2 text-sm font-medium text-ink-700 bg-cream-200 rounded-md hover:bg-ink-200"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleCustomApply}
 disabled={!customStart || !customEnd || customStart > customEnd}
 className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-ink-800 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Apply
 </button>
 </div>
 </div>
 </GenericModal>
 </div>
 );
}
