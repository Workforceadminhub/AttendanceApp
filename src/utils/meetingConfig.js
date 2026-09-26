import { isMeetingDate, normalizeDateString } from "./meetingLinks";

export const MEETINGS_CHANGED_EVENT = "harvesters:meetings-changed";

// Purge any legacy browser localStorage entries
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("harvesters_meetings_config");
    localStorage.removeItem("harvesters_deleted_meetings_config");
  } catch {}
}

export const DEFAULT_LEADERS_MEETING_DATE = "2026-09-19";
export const DEFAULT_WORKERS_MEETING_DATE = "2026-09-19";

export const INITIAL_MEETINGS = [
  {
    id: "leaders-default-2",
    meetingType: "leaders",
    date: DEFAULT_LEADERS_MEETING_DATE,
    title: "September 2026 Leaders Meeting",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "workers-default-2",
    meetingType: "workers",
    date: DEFAULT_WORKERS_MEETING_DATE,
    title: "September 2026 Workers Meeting",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// In-memory cache for the current session/runtime (zero browser localStorage reliance)
let memoryMeetings = INITIAL_MEETINGS.map((m) => ({ ...m }));

/**
 * Resets the in-memory meetings cache (primarily for tests or full re-fetch).
 */
export function resetMeetingsCache(initial = INITIAL_MEETINGS) {
  memoryMeetings = initial.map((m) => ({ ...m }));
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("harvesters_meetings_config");
      localStorage.removeItem("harvesters_deleted_meetings_config");
    } catch {}
    window.dispatchEvent(new Event(MEETINGS_CHANGED_EVENT));
  }
}

/**
 * Gets all meetings for a given type ("leaders" or "workers") from in-memory cache
 */
export function getAllMeetings(meetingType = "leaders") {
  return memoryMeetings.filter((m) => m.meetingType === meetingType);
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
  return active ? active.date : "";
}

/**
 * Creates a meeting in in-memory state and optionally sets it as active
 */
export function createMeeting({ meetingType = "leaders", date, title, notes, setAsActive = true }) {
  if (!isMeetingDate(date?.trim())) {
    throw new Error("A valid meeting date (YYYY-MM-DD) is required.");
  }

  const trimmedDate = date.trim();
  const type = meetingType.toLowerCase();
  const meetingTitle = (title || "").trim() || `${type === "leaders" ? "Leaders" : "Workers"} Meeting (${trimmedDate})`;

  let updated = memoryMeetings.map((m) => {
    if (setAsActive && m.meetingType === type) {
      return { ...m, isActive: false };
    }
    return m;
  });

  const newMeeting = {
    id: `${type}-${Date.now()}`,
    meetingType: type,
    date: trimmedDate,
    title: meetingTitle,
    notes: (notes || "").trim(),
    isActive: Boolean(setAsActive),
    createdAt: new Date().toISOString(),
  };

  memoryMeetings = [newMeeting, ...updated];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEETINGS_CHANGED_EVENT));
  }
  return newMeeting;
}

/**
 * Sets a specific meeting ID as active for its type in in-memory cache
 */
export function setActiveMeeting(meetingId) {
  const target = memoryMeetings.find((m) => m.id === meetingId);
  if (!target) return;

  memoryMeetings = memoryMeetings.map((m) => {
    if (m.meetingType === target.meetingType) {
      return { ...m, isActive: m.id === meetingId };
    }
    return m;
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEETINGS_CHANGED_EVENT));
  }
}

/**
 * Deletes a meeting by ID from in-memory cache
 */
export function deleteMeeting(meetingId) {
  const target = memoryMeetings.find((m) => m.id === meetingId);
  if (!target) return;

  let updated = memoryMeetings.filter((m) => m.id !== meetingId);

  // If we deleted the active meeting, set the first remaining one as active
  const remainingSameType = updated.filter((m) => m.meetingType === target.meetingType);
  if (target.isActive && remainingSameType.length > 0) {
    const nextActiveId = remainingSameType[0].id;
    updated = updated.map((m) => (m.id === nextActiveId ? { ...m, isActive: true } : m));
  }

  memoryMeetings = updated;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEETINGS_CHANGED_EVENT));
  }
}

/**
 * Formats a YYYY-MM-DD date string into a human readable display format,
 * e.g. "Saturday, 15th August 2026"
 */
export function formatMeetingDisplayDate(dateStr) {
  if (!dateStr) return "";
  const clean = normalizeDateString(dateStr);
  if (!clean) return typeof dateStr === "string" ? dateStr : "";
  try {
    const [year, month, day] = clean.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return clean;
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const monthName = date.toLocaleDateString("en-US", { month: "long" });

    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${dayName}, ${getOrdinal(day)} ${monthName} ${year}`;
  } catch {
    return clean;
  }
}

/**
 * Synchronize meetings cache for a category with backend data in memory.
 */
export function syncMeetingsCache(meetingType, remoteMeetings) {
  if (!Array.isArray(remoteMeetings)) return;
  const targetType = meetingType.toLowerCase();
  const currentCategory = memoryMeetings.filter((m) => m.meetingType === targetType);
  const others = memoryMeetings.filter((m) => m.meetingType !== targetType);
  const sanitizedRemote = remoteMeetings
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const type = (m.meetingType || m.meeting_type || targetType).toLowerCase();
      if (type !== targetType) return null;
      const date = normalizeDateString(m.date || m.meeting_date);
      if (!date) return null;
      return {
        ...m,
        id: m.id ?? `${type}-${date}`,
        meetingType: type,
        date,
        title: m.title || `${type === "leaders" ? "Leaders" : "Workers"} Meeting (${date})`,
        isActive: Boolean(m.isActive ?? m.is_active ?? m.set_active),
      };
    })
    .filter(Boolean);

  const hasChanged =
    currentCategory.length !== sanitizedRemote.length ||
    sanitizedRemote.some((remote, idx) => {
      const cur = currentCategory[idx];
      return (
        !cur ||
        String(cur.id) !== String(remote.id) ||
        cur.date !== remote.date ||
        cur.isActive !== remote.isActive ||
        cur.title !== remote.title
      );
    });

  if (!hasChanged) return;

  memoryMeetings = [...others, ...sanitizedRemote];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEETINGS_CHANGED_EVENT));
  }
}

/**
 * Synchronize active meeting in cache with backend data in memory.
 */
export function syncActiveMeetingCache(activeMeeting) {
  if (!activeMeeting || typeof activeMeeting !== "object") return;
  const meetingType = (activeMeeting.meetingType || activeMeeting.meeting_type || "").toLowerCase();
  const date = normalizeDateString(activeMeeting.date || activeMeeting.meeting_date);
  if (!meetingType || !date) return;
  const sanitized = {
    ...activeMeeting,
    id: activeMeeting.id || `${meetingType}-${date}`,
    meetingType,
    date,
    isActive: true,
    title: activeMeeting.title || `${meetingType === "leaders" ? "Leaders" : "Workers"} Meeting (${date})`,
  };

  const isMatch = (m) => String(m.id) === String(sanitized.id);

  const currentActive = memoryMeetings.find((m) => m.meetingType === meetingType && m.isActive);
  if (currentActive && isMatch(currentActive) && currentActive.title === sanitized.title && currentActive.date === sanitized.date) {
    return;
  }

  const exists = memoryMeetings.some(isMatch);
  const updated = exists
    ? memoryMeetings.map((m) => {
        if (m.meetingType !== sanitized.meetingType) return m;
        if (isMatch(m)) {
          return { ...m, ...sanitized, isActive: true };
        }
        return { ...m, isActive: false };
      })
    : [
        sanitized,
        ...memoryMeetings.map((m) =>
          m.meetingType === sanitized.meetingType ? { ...m, isActive: false } : m
        ),
      ];
  memoryMeetings = updated;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEETINGS_CHANGED_EVENT));
  }
}
