export const DEFAULT_LEADERS_MEETING_DATE = "2026-08-15";
export const DEFAULT_WORKERS_MEETING_DATE = "2026-08-15";

/**
 * Returns the effective date for a meeting.
 * Supports override via URL query parameter '?date=YYYY-MM-DD'.
 */
export function getMeetingDate(defaultDate = "2026-08-15") {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlDate = params.get("date");
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate.trim())) {
      return urlDate.trim();
    }
  } catch {
    // Fallback if window is undefined
  }
  return defaultDate;
}

/**
 * Formats a YYYY-MM-DD date string into a human readable display format,
 * e.g. "Saturday, 15th August 2026"
 */
export function formatMeetingDisplayDate(dateStr) {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const monthName = date.toLocaleDateString("en-US", { month: "long" });

    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${dayName}, ${getOrdinal(day)} ${monthName} ${year}`;
  } catch {
    return dateStr;
  }
}
