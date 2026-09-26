import { hubGet, hubPost, hubPatch, hubDelete } from "./client";
import { apiRequest } from "../../utils/apiClient";
import {
  getAllMeetings,
  getActiveMeeting,
  syncMeetingsCache,
  syncActiveMeetingCache,
  setActiveMeeting as setActiveMeetingLocal,
  deleteMeeting as deleteMeetingLocal,
} from "../../utils/meetingConfig";
import { normalizeDateString } from "../../utils/meetingLinks";

/**
 * Normalizes a meeting object from either API (snake_case) or camelCase.
 * Returns null if the object is invalid or does not contain a recognizable meetingType and valid date.
 *
 * @param {Object} m
 * @param {string} [fallbackType]
 */
export function normalizeMeeting(m, fallbackType = "") {
  if (!m || typeof m !== "object") return null;

  const rawType = (
    m.meeting_type ||
    m.meetingType ||
    m.type ||
    m.category ||
    fallbackType ||
    ""
  ).toLowerCase().trim();

  let meetingType = "";
  if (rawType.includes("lead")) {
    meetingType = "leaders";
  } else if (rawType.includes("work")) {
    meetingType = "workers";
  } else if (fallbackType) {
    meetingType = fallbackType.toLowerCase().includes("work") ? "workers" : "leaders";
  }
  if (!meetingType) return null;

  const rawDate =
    m.meeting_date ||
    m.meetingDate ||
    m.date ||
    m.scheduled_date ||
    m.scheduledDate ||
    m.start_date ||
    m.startDate ||
    m.event_date ||
    m.eventDate ||
    m.session_date ||
    m.sessionDate ||
    "";
  const date = normalizeDateString(rawDate);
  if (!date) return null;

  const id =
    m.id ??
    m.meeting_id ??
    m.meetingId ??
    m._id ??
    `${meetingType}-${date}`;

  return {
    id,
    meetingType,
    date,
    title:
      m.title ||
      m.name ||
      m.label ||
      m.meeting_title ||
      `${meetingType === "leaders" ? "Leaders" : "Workers"} Meeting (${date})`,
    notes: m.notes || m.description || "",
    isActive: Boolean(
      m.is_active ??
      m.isActive ??
      m.set_active ??
      m.active ??
      (typeof m.status === "string" && m.status.toLowerCase() === "active")
    ),
    createdAt: m.created_at || m.createdAt || new Date().toISOString(),
  };
}

/**
 * Robustly extracts a list of meeting objects from various backend envelope shapes.
 *
 * @param {any} payload
 * @param {string} [meetingType]
 * @returns {Array}
 */
export function extractListFromPayload(payload, meetingType = "") {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const listKeys = [
    "data",
    "meetings",
    "records",
    "results",
    "result",
    "rows",
    "items",
    "list",
  ];
  for (const k of listKeys) {
    if (Array.isArray(payload[k])) return payload[k];
    if (Array.isArray(payload.data?.[k])) return payload.data[k];
  }

  const typeKey = meetingType ? meetingType.toLowerCase() : "";
  if (typeKey) {
    if (Array.isArray(payload[typeKey])) return payload[typeKey];
    if (Array.isArray(payload.data?.[typeKey])) return payload.data[typeKey];
  }

  if (Array.isArray(payload.leaders)) return payload.leaders;
  if (Array.isArray(payload.workers)) return payload.workers;
  if (Array.isArray(payload.data?.leaders)) return payload.data.leaders;
  if (Array.isArray(payload.data?.workers)) return payload.data.workers;

  // If payload is an object dictionary of meetings
  if (typeof payload === "object") {
    const values = Object.values(payload);
    if (
      values.length > 0 &&
      values.every(
        (v) =>
          v &&
          typeof v === "object" &&
          (v.meeting_date || v.meetingDate || v.date || v.meeting_type || v.title)
      )
    ) {
      return values;
    }
  }

  // If single meeting object was returned in payload or payload.data
  if (typeof payload === "object" && (payload.meeting_date || payload.date)) {
    return [payload];
  }
  if (typeof payload.data === "object" && (payload.data.meeting_date || payload.data.date)) {
    return [payload.data];
  }

  return [];
}

/**
 * Fetch all meetings for a given category.
 * Tries case and parameter variations sequentially so server quirks don't block retrieval.
 *
 * @param {"leaders"|"workers"} meetingType
 * @returns {Promise<Array>} List of normalized meetings
 */
export async function fetchMeetings(meetingType = "leaders") {
  const normalizedType = meetingType.toLowerCase();
  const capitalizedType =
    normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);

  let rawList = [];
  let lastError = null;
  let backendReturnedEmpty = false;

  const candidates = [
    { meeting_type: normalizedType },
    { meeting_type: capitalizedType },
    undefined, // GET /super/admin/meetings without query params
    { type: normalizedType },
    { type: capitalizedType },
  ];

  // Try standard hub endpoints first, then direct super admin endpoints if empty
  const endpointPaths = ["/super/admin/meetings", "/api/super/admin/meetings"];

  for (const basePath of endpointPaths) {
    for (const params of candidates) {
      try {
        const res = basePath.startsWith("/api/")
          ? await apiRequest("GET", basePath, params)
          : await hubGet(basePath, params);
        const payload = res?.data ?? res;
        const list = extractListFromPayload(payload, normalizedType);

        if (list.length > 0) {
          if (!params) {
            // If fetched without filter, select only items for this category
            const filtered = list.filter((m) => {
              const t = (
                m?.meeting_type ||
                m?.meetingType ||
                m?.type ||
                m?.category ||
                ""
              ).toLowerCase();
              return !t || t.includes(normalizedType.slice(0, 4));
            });
            if (filtered.length > 0) {
              rawList = filtered;
              break;
            }
          } else {
            rawList = list;
            break;
          }
        } else if (res && (Array.isArray(res) || Array.isArray(res?.data) || Array.isArray(res?.meetings))) {
          backendReturnedEmpty = true;
        }
      } catch (err) {
        lastError = err;
      }
    }
    if (rawList.length > 0) break;
  }

  if (rawList.length > 0) {
    const normalized = rawList
      .map((m) => normalizeMeeting(m, normalizedType))
      .filter(Boolean);

    if (normalized.length > 0) {
      syncMeetingsCache(normalizedType, normalized);
      return normalized;
    }
  }

  if (backendReturnedEmpty && !lastError) {
    syncMeetingsCache(normalizedType, []);
    return [];
  }

  if (lastError) {
    console.error(`Failed to fetch ${meetingType} meetings from backend:`, lastError);
  }

  return getAllMeetings(normalizedType);
}

/**
 * Fetch the currently active meeting(s).
 *
 * @param {"leaders"|"workers"} [meetingType]
 * @returns {Promise<Object|null>} Active meeting object
 */
export async function fetchActiveMeeting(meetingType) {
  const normalizedType = meetingType ? meetingType.toLowerCase() : "";
  const capitalizedType = normalizedType
    ? normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)
    : "";

  const candidates = normalizedType
    ? [
        { meeting_type: normalizedType },
        { meeting_type: capitalizedType },
        undefined, // GET /super/admin/meetings/active without query params
      ]
    : [undefined];

  const activePaths = ["/super/admin/meetings/active", "/api/super/admin/meetings/active"];

  for (const basePath of activePaths) {
    for (const params of candidates) {
      try {
        const res = basePath.startsWith("/api/")
          ? await apiRequest("GET", basePath, params)
          : await hubGet(basePath, params);
        const payload = res?.data ?? res;

        const list = [];
        if (Array.isArray(payload)) {
          list.push(...payload);
        } else if (payload && typeof payload === "object") {
          if (Array.isArray(payload.data)) {
            list.push(...payload.data);
          } else {
            if (payload.leaders) list.push(payload.leaders);
            if (payload.workers) list.push(payload.workers);
            if (payload.data?.leaders) list.push(payload.data.leaders);
            if (payload.data?.workers) list.push(payload.data.workers);
            if (
              payload.meeting_type ||
              payload.meetingType ||
              payload.type ||
              payload.meeting_date ||
              payload.date
            ) {
              list.push(payload);
            }
          }
        }

        const normalizedList = list
          .map((m) => normalizeMeeting(m, normalizedType))
          .filter(Boolean);

        for (const item of normalizedList) {
          syncActiveMeetingCache(item);
        }

        if (normalizedType) {
          const match = normalizedList.find((m) => m.meetingType === normalizedType);
          if (match) return match;
        } else if (normalizedList.length > 0) {
          return normalizedList[0];
        }
      } catch {
        // try next candidate
      }
    }
  }

  return meetingType ? getActiveMeeting(meetingType) : null;
}

/**
 * Create a new meeting in the backend.
 * POST /api/hub/super/admin/meetings
 *
 * @param {Object} data
 * @param {"leaders"|"workers"} data.meetingType
 * @param {string} data.date - YYYY-MM-DD
 * @param {string} [data.title]
 * @param {string} [data.notes]
 * @param {boolean} [data.setAsActive=true]
 * @returns {Promise<Object>} Created meeting object
 */
export async function createMeetingRemote({
  meetingType = "leaders",
  date,
  title,
  notes,
  setAsActive = true,
}) {
  const normalizedType = meetingType.toLowerCase();
  const capitalizedType =
    normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);

  const trimmedDate = date.trim();
  const meetingTitle =
    (title || "").trim() || `${capitalizedType} Meeting (${trimmedDate})`;
  const meetingNotes =
    (notes || "").trim() || meetingTitle;

  const payload = {
    meeting_type: capitalizedType, // "Leaders" or "Workers"
    meeting_date: trimmedDate,
    title: meetingTitle,
    notes: meetingNotes,
    set_active: Boolean(setAsActive),
  };

  try {
    let res;
    try {
      res = await hubPost("/super/admin/meetings", payload);
    } catch (firstErr) {
      // If error indicates meeting already exists, throw immediately
      const msg =
        firstErr?.responseData?.message ||
        firstErr?.responseData?.error ||
        firstErr?.message ||
        "";
      if (/already\s+exist/i.test(msg)) {
        throw firstErr;
      }

      // If capitalized meeting_type failed validation, retry with lowercase
      res = await hubPost("/super/admin/meetings", {
        ...payload,
        meeting_type: normalizedType,
      });
    }

    const responsePayload = res?.data ?? res;
    const created =
      normalizeMeeting(responsePayload, normalizedType) || {
        id: responsePayload?.id || `${normalizedType}-${Date.now()}`,
        meetingType: normalizedType,
        date: trimmedDate,
        title: meetingTitle,
        notes: meetingNotes,
        isActive: Boolean(setAsActive),
        createdAt: new Date().toISOString(),
      };

    // Update in-memory cache directly with backend response
    if (created.isActive) {
      syncActiveMeetingCache(created);
    } else {
      const currentList = getAllMeetings(normalizedType).filter((m) => m.id !== created.id);
      syncMeetingsCache(normalizedType, [created, ...currentList]);
    }

    return created;
  } catch (err) {
    console.error("Backend meeting creation failed:", err);
    throw err;
  }
}

/**
 * Mark a specific meeting as active.
 * PATCH /api/hub/super/admin/meetings/{id}/active
 *
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function setActiveMeetingRemote(id) {
  try {
    const res = await hubPatch(`/super/admin/meetings/${id}/active`);
    setActiveMeetingLocal(id);
    return res?.data || res;
  } catch (err) {
    console.error("Backend setActive failed:", err);
    throw err;
  }
}

/**
 * Delete a meeting.
 * DELETE /api/hub/super/admin/meetings/{id}
 *
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function deleteMeetingRemote(id) {
  const isLocalOnly = typeof id === "string" && !/^\d+$/.test(id);
  if (isLocalOnly) {
    deleteMeetingLocal(id);
    return { success: true };
  }

  try {
    const res = await hubDelete(`/super/admin/meetings/${id}`);
    deleteMeetingLocal(id);
    return res?.data || res;
  } catch (err) {
    console.error("Backend delete failed:", err);
    throw err;
  }
}
