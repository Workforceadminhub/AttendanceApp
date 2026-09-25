const ROUTES = {
  leaders: { confirm: "/leadersmeeting/confirm", present: "/leaders-meeting", confirmationReport: "/report/confirmation-leaders-meeting", attendanceReport: "/report/leaders-meeting" },
  workers: { confirm: "/workersmeeting/confirm", present: "/workers-meeting", confirmationReport: "/report/confirmation-workers-meeting", attendanceReport: "/report/workers-meeting" },
};

/**
 * Normalizes any date value (YYYY-MM-DD, ISO 8601 string, space-separated datetime, Date instance)
 * into a strict "YYYY-MM-DD" calendar date string.
 * Returns an empty string if invalid, impossible (e.g. 2026-02-30), or unparseable.
 */
export function normalizeDateString(val) {
  if (!val) return "";
  let s = "";
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return "";
    s = val.toISOString().slice(0, 10);
  } else if (typeof val === "string") {
    s = val.trim();
    if (s.includes("T")) s = s.split("T")[0];
    if (s.includes(" ")) s = s.split(" ")[0];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : "";
}

export function isMeetingDate(value) {
  if (!value) return false;
  return Boolean(normalizeDateString(value));
}

const PUBLIC_DESTINATIONS = new Set(["confirm", "present"]);

/**
 * Public confirm/present links are shared without a date so every device submits the
 * current meeting; only admin report links carry the date they were created for.
 */
export function meetingPath(meetingType, date, destination = "confirm") {
  const type = (meetingType || "leaders").toLowerCase();
  const route = ROUTES[type]?.[destination] || ROUTES.leaders[destination] || "/";
  if (PUBLIC_DESTINATIONS.has(destination)) return route;
  const cleanDate = normalizeDateString(date);
  if (cleanDate && isMeetingDate(cleanDate)) {
    return `${route}?meeting_date=${encodeURIComponent(cleanDate)}`;
  }
  return route;
}
