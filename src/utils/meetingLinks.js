const ROUTES = {
  leaders: { confirm: "/leadersmeeting/confirm", present: "/leaders-meeting", confirmationReport: "/report/confirmation-leaders-meeting", attendanceReport: "/report/leaders-meeting" },
  workers: { confirm: "/workersmeeting/confirm", present: "/workers-meeting", confirmationReport: "/report/confirmation-workers-meeting", attendanceReport: "/report/workers-meeting" },
};

export function isMeetingDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function meetingPath(meetingType, date, destination = "confirm") {
  const route = ROUTES[meetingType]?.[destination];
  if (!route || !isMeetingDate(date)) throw new Error("Choose a valid meeting date.");
  return `${route}?meeting_date=${encodeURIComponent(date)}`;
}
