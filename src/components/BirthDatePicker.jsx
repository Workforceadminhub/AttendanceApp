import { useState, useRef, useEffect } from "react";

// Helper function to get ordinal suffix
const getOrdinalSuffix = (day) => {
 if (day > 3 && day < 21) return "th";
 switch (day % 10) {
 case 1: return "st";
 case 2: return "nd";
 case 3: return "rd";
 default: return "th";
 }
};

// Helper function to format date to "DDth Month" format
const formatBirthDate = (day, month) => {
 const months = [
 "January", "February", "March", "April", "May", "June",
 "July", "August", "September", "October", "November", "December"
 ];
 return `${day}${getOrdinalSuffix(day)} ${months[month]}`;
};

// Helper function to parse "DDth Month" format back to day and month
const parseBirthDate = (dateString) => {
 if (!dateString) return { day: null, month: null };
 
 const months = [
 "january", "february", "march", "april", "may", "june",
 "july", "august", "september", "october", "november", "december"
 ];
 
 // Match patterns like "12th January", "1st February", "23rd March"
 const match = dateString.match(/^(\d{1,2})(st|nd|rd|th)?\s+(\w+)$/i);
 if (match) {
 const day = parseInt(match[1], 10);
 const monthName = match[3].toLowerCase();
 const month = months.indexOf(monthName);
 if (month !== -1 && day >= 1 && day <= 31) {
 return { day, month };
 }
 }
 
 return { day: null, month: null };
};

// Get number of days in a month
const getDaysInMonth = (month) => {
 // Using a non-leap year as default since we don't care about year
 const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
 return daysInMonth[month] || 31;
};

export default function BirthDatePicker({ value, onChange, placeholder = "Select birth date", className = "" }) {
 const [isOpen, setIsOpen] = useState(false);
 const [selectedDay, setSelectedDay] = useState(null);
 const [selectedMonth, setSelectedMonth] = useState(null);
 const dropdownRef = useRef(null);

 const months = [
 "January", "February", "March", "April", "May", "June",
 "July", "August", "September", "October", "November", "December"
 ];

 // Parse initial value
 useEffect(() => {
 if (value) {
 const { day, month } = parseBirthDate(value);
 if (day !== null && month !== null) {
 setSelectedDay(day);
 setSelectedMonth(month);
 }
 }
 }, [value]);

 // Close dropdown when clicking outside
 useEffect(() => {
 const handleClickOutside = (event) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
 setIsOpen(false);
 }
 };

 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 const handleMonthSelect = (monthIndex) => {
 setSelectedMonth(monthIndex);
 // If selected day is greater than days in new month, reset it
 if (selectedDay && selectedDay > getDaysInMonth(monthIndex)) {
 setSelectedDay(null);
 }
 };

 const handleDaySelect = (day) => {
 setSelectedDay(day);
 if (selectedMonth !== null) {
 const formattedDate = formatBirthDate(day, selectedMonth);
 onChange(formattedDate);
 setIsOpen(false);
 }
 };

 const handleClear = () => {
 setSelectedDay(null);
 setSelectedMonth(null);
 onChange("");
 setIsOpen(false);
 };

 const daysInCurrentMonth = selectedMonth !== null ? getDaysInMonth(selectedMonth) : 31;

 return (
 <div className={`relative ${className}`} ref={dropdownRef}>
 {/* Input Display */}
 <div
 className="w-full px-3 py-2 border border-ink-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-ink-900/10 flex items-center justify-between"
 onClick={() => setIsOpen(!isOpen)}
 >
 <span className={value ? "text-ink-900" : "text-ink-400"}>
 {value || placeholder}
 </span>
 <div className="flex items-center space-x-2">
 {value && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleClear();
 }}
 className="text-ink-400 hover:text-ink-600"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 )}
 <svg
 className={`w-5 h-5 text-ink-400 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </div>
 </div>

 {/* Dropdown */}
 {isOpen && (
 <div className="absolute z-50 mt-1 w-full bg-white border border-ink-300 rounded-lg shadow-lg p-4">
 {/* Month Selector */}
 <div className="mb-4">
 <label className="block text-sm font-medium text-ink-700 mb-2">Month</label>
 <select
 value={selectedMonth ?? ""}
 onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Month</option>
 {months.map((month, index) => (
 <option key={month} value={index}>
 {month}
 </option>
 ))}
 </select>
 </div>

 {/* Day Selector */}
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">Day</label>
 {selectedMonth !== null ? (
 <div className="grid grid-cols-7 gap-1">
 {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((day) => (
 <button
 key={day}
 type="button"
 onClick={() => handleDaySelect(day)}
 className={`p-2 text-sm rounded-md transition-colors ${
 selectedDay === day
 ? "bg-ink-900 text-white"
 : "bg-cream hover:bg-ink-100 text-ink-700"
 }`}
 >
 {day}
 </button>
 ))}
 </div>
 ) : (
 <div className="text-center py-4 text-ink-400 text-sm">
 Please select a month first
 </div>
 )}
 </div>

 {/* Preview */}
 {selectedDay && selectedMonth !== null && (
 <div className="mt-4 pt-3 border-t border-ink-200">
 <p className="text-sm text-ink-600">
 Selected: <span className="font-medium text-ink-900">{formatBirthDate(selectedDay, selectedMonth)}</span>
 </p>
 </div>
 )}
 </div>
 )}
 </div>
 );
}

// Export helper functions for use in other components
export { formatBirthDate, parseBirthDate, getOrdinalSuffix };
