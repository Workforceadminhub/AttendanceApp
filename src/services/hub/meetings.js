import { hubGet, hubPost, hubPatch, hubDelete } from "./client";
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
 */
export function normalizeMeeting(m) {
  if (!m || typeof m !== "object") return null;
  const meetingTypeRaw = m.meeting_type || m.meetingType;
  if (!meetingTypeRaw || typeof meetingTypeRaw !== "string") return null;
  const meetingType = meetingTypeRaw.toLowerCase();
  if (meetingType !== "leaders" && meetingType !== "workers") return null;

  const rawDate = m.meeting_date || m.date || "";
  const date = normalizeDateString(rawDate);
  if (!date) return null;

  return {
    id: m.id ?? `${meetingType}-${date}`,
    meetingType,
    date,
    title: m.title || `${meetingType === "leaders" ? "Leaders" : "Workers"} Meeting (${date})`,
    notes: m.notes || "",
    isActive: Boolean(m.is_active ?? m.isActive ?? m.set_active),
    createdAt: m.created_at || m.createdAt || new Date().toISOString(),
  };
}

function extractListFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.meetings)) return payload.meetings;
  if (Array.isArray(payload?.data?.meetings)) return payload.data.meetings;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

/**
 * Fetch all meetings for a given category (or all if omitted).
 * GET /api/hub/super/admin/meetings?meeting_type=leaders
 *
 * @param {"leaders"|"workers"} meetingType
 * @returns {Promise<Array>} List of normalized meetings
 */
export async function fetchMeetings(meetingType = "leaders") {
  const normalizedType = meetingType.toLowerCase();
  const capitalizedType =
    normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);

  try {
    // 1. Try with lowercase meeting_type
    let res = await hubGet("/super/admin/meetings", {
      meeting_type: normalizedType,
    });
    let payload = res?.data ?? res;
    let rawList = extractListFromPayload(payload);

    // 2. If empty, try capitalized meeting_type in case backend has case-sensitive DB (e.g. PostgreSQL)
    if (rawList.length === 0) {
      const resCap = await hubGet("/super/admin/meetings", {
        meeting_type: capitalizedType,
      });
      const payloadCap = resCap?.data ?? resCap;
      const rawListCap = extractListFromPayload(payloadCap);
      if (rawListCap.length > 0) {
        rawList = rawListCap;
      }
    }

    // 3. If still empty, try without query params in case backend returns all meetings
    if (rawList.length === 0) {
      const resAll = await hubGet("/super/admin/meetings");
      const payloadAll = resAll?.data ?? resAll;
      const rawListAll = extractListFromPayload(payloadAll);
      const filtered = rawListAll.filter((m) => {
        const t = (m?.meeting_type || m?.meetingType || "").toLowerCase();
        return t === normalizedType;
      });
      if (filtered.length > 0) {
        rawList = filtered;
      }
    }

    const normalized = rawList.map(normalizeMeeting).filter(Boolean);

    // Synchronize in-memory cache
    if (normalized.length > 0) {
      syncMeetingsCache(normalizedType, normalized);
      return normalized;
    }
    return getAllMeetings(normalizedType);
  } catch (err) {
    console.error(`Failed to fetch ${meetingType} meetings from backend:`, err);
    return getAllMeetings(normalizedType);
  }
}

/**
 * Fetch the currently active meeting(s).
 * GET /api/hub/super/admin/meetings/active
 *
 * @param {"leaders"|"workers"} [meetingType]
 * @returns {Promise<Object|null>} Active meeting object
 */
export async function fetchActiveMeeting(meetingType) {
  try {
    const res = await hubGet(
      "/super/admin/meetings/active",
      meetingType ? { meeting_type: meetingType.toLowerCase() } : undefined
    );
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
        if (payload.meeting_type || payload.meetingType) list.push(payload);
      }
    }

    const normalizedList = list.map(normalizeMeeting).filter(Boolean);
    for (const item of normalizedList) {
      syncActiveMeetingCache(item);
    }

    if (meetingType) {
      const match = normalizedList.find((m) => m.meetingType === meetingType.toLowerCase());
      if (match) return match;
    } else if (normalizedList.length > 0) {
      return normalizedList[0];
    }
  } catch (err) {
    console.error("Failed to fetch active meeting from backend:", err);
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
      // If capitalized meeting_type failed validation, retry with lowercase
      res = await hubPost("/super/admin/meetings", {
        ...payload,
        meeting_type: normalizedType,
      });
    }

    const responsePayload = res?.data ?? res;
    const created =
      normalizeMeeting(responsePayload) || {
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
  // If local synthetic ID (e.g. from tests or fallback), delete from memory
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
