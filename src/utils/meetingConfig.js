const MEETINGS_STORAGE_KEY = "harvesters_meetings_config";

export const DEFAULT_LEADERS_MEETING_DATE = "2026-08-15";
export const DEFAULT_WORKERS_MEETING_DATE = "2026-08-15";

const INITIAL_MEETINGS = [
  {
    id: "leaders-default-1",
    meetingType: "leaders",
    date: DEFAULT_LEADERS_MEETING_DATE,
    title: "August 2026 Leaders Meeting",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "workers-default-1",
    meetingType: "workers",
    date: DEFAULT_WORKERS_MEETING_DATE,
    title: "August 2026 Workers Meeting",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Loads meetings array from localStorage or returns default
 */
export function getStoredMeetings() {
  try {
    const raw = localStorage.getItem(MEETINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read meetings from storage:", err);
  }
  saveStoredMeetings(INITIAL_MEETINGS);
  return INITIAL_MEETINGS;
}

/**
 * Saves meetings array to localStorage
 */
export function saveStoredMeetings(meetings) {
  try {
    localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetings));
  } catch (err) {
    console.error("Failed to save meetings to storage:", err);
  }
}

/**
 * Gets all meetings for a given type ("leaders" or "workers")
 */
export function getAllMeetings(meetingType = "leaders") {
  const meetings = getStoredMeetings();
  return meetings.filter((m) => m.meetingType === meetingType);
}

/**
 * Gets active meeting configuration for a given type ("leaders" or "workers")
 */
export function getActiveMeeting(meetingType = "leaders") {
  const list = getAllMeetings(meetingType);
  const active = list.find((m) => m.isActive);
  if (active) return active;
  if (list.length > 0) return list[0];
  
  const defaultDate = meetingType === "leaders" ? DEFAULT_LEADERS_MEETING_DATE : DEFAULT_WORKERS_MEETING_DATE;
  return {
    id: `${meetingType}-fallback`,
    meetingType,
    date: defaultDate,
    title: `${meetingType === "leaders" ? "Leaders" : "Workers"} Meeting`,
    isActive: true,
  };
}

/**
 * Gets active meeting date string (YYYY-MM-DD) for a given type
 */
export function getMeetingDate(meetingType = "leaders") {
  const active = getActiveMeeting(meetingType);
  return active.date;
}

/**
 * Creates a new meeting and optionally sets it as active
 */
export function createMeeting({ meetingType = "leaders", date, title, setAsActive = true }) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    throw new Error("A valid meeting date (YYYY-MM-DD) is required.");
  }

  const meetings = getStoredMeetings();
  const trimmedDate = date.trim();
  const meetingTitle = (title || "").trim() || `${meetingType === "leaders" ? "Leaders" : "Workers"} Meeting (${trimmedDate})`;

  let updated = meetings.map((m) => {
    if (setAsActive && m.meetingType === meetingType) {
      return { ...m, isActive: false };
    }
    return m;
  });

  const newMeeting = {
    id: `${meetingType}-${Date.now()}`,
    meetingType,
    date: trimmedDate,
    title: meetingTitle,
    isActive: setAsActive,
    createdAt: new Date().toISOString(),
  };

  updated.unshift(newMeeting);
  saveStoredMeetings(updated);
  return newMeeting;
}

/**
 * Sets a specific meeting ID as active for its type
 */
export function setActiveMeeting(meetingId) {
  const meetings = getStoredMeetings();
  const target = meetings.find((m) => m.id === meetingId);
  if (!target) return;

  const updated = meetings.map((m) => {
    if (m.meetingType === target.meetingType) {
      return { ...m, isActive: m.id === meetingId };
    }
    return m;
  });

  saveStoredMeetings(updated);
}

/**
 * Deletes a meeting by ID
 */
export function deleteMeeting(meetingId) {
  const meetings = getStoredMeetings();
  const target = meetings.find((m) => m.id === meetingId);
  if (!target) return;

  let updated = meetings.filter((m) => m.id !== meetingId);
  
  // If we deleted the active meeting, set the first remaining one as active
  const remainingSameType = updated.filter((m) => m.meetingType === target.meetingType);
  if (target.isActive && remainingSameType.length > 0) {
    remainingSameType[0].isActive = true;
  } else if (remainingSameType.length === 0) {
    const defaultDate = target.meetingType === "leaders" ? DEFAULT_LEADERS_MEETING_DATE : DEFAULT_WORKERS_MEETING_DATE;
    updated.push({
      id: `${target.meetingType}-default`,
      meetingType: target.meetingType,
      date: defaultDate,
      title: `Default ${target.meetingType === "leaders" ? "Leaders" : "Workers"} Meeting`,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  }

  saveStoredMeetings(updated);
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
