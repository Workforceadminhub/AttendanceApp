import { hubGet, hubPost, hubPatch, hubDelete } from "./client";
import {
  getAllMeetings,
  getActiveMeeting,
  syncMeetingsCache,
  syncActiveMeetingCache,
  createMeeting as createMeetingLocal,
  setActiveMeeting as setActiveMeetingLocal,
  deleteMeeting as deleteMeetingLocal,
} from "../../utils/meetingConfig";
import { normalizeDateString } from "../../utils/meetingLinks";

/**
 * Normalizes a meeting object from either API (snake_case) or local storage (camelCase).
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

/**
 * Fetch all meetings for a given category (or all if omitted).
 * GET /api/hub/super/admin/meetings?meeting_type=leaders
 *
 * @param {"leaders"|"workers"} meetingType
 * @returns {Promise<Array>} List of normalized meetings
 */
export async function fetchMeetings(meetingType = "leaders") {
  try {
    const res = await hubGet("/super/admin/meetings", {
      meeting_type: meetingType.toLowerCase(),
    });
    const payload = res?.data ?? res;
    const rawList = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : [];
    const normalized = rawList.map(normalizeMeeting).filter(Boolean);

    // Synchronize local storage cache
    if (normalized.length > 0) {
      syncMeetingsCache(meetingType.toLowerCase(), normalized);
      return normalized;
    }
    return getAllMeetings(meetingType);
  } catch (err) {
    console.error(`Failed to fetch ${meetingType} meetings from backend:`, err);
    return getAllMeetings(meetingType);
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

  const payload = {
    meeting_type: capitalizedType, // "Leaders" or "Workers"
    meeting_date: date.trim(),
    title:
      (title || "").trim() ||
      `${capitalizedType} Meeting (${date.trim()})`,
    notes: (notes || "").trim() || undefined,
    set_active: Boolean(setAsActive),
  };

  try {
    const res = await hubPost("/super/admin/meetings", payload);
    const created =
      normalizeMeeting(res?.data || res) || {
        id: `${normalizedType}-${Date.now()}`,
        meetingType: normalizedType,
        date: date.trim(),
        title: payload.title,
        notes: payload.notes || "",
        isActive: Boolean(setAsActive),
        createdAt: new Date().toISOString(),
      };

    // Update local cache
    createMeetingLocal({
      meetingType: normalizedType,
      date: created.date,
      title: created.title,
      setAsActive,
    });

    return created;
  } catch (err) {
    console.error("Backend meeting creation failed, saving locally:", err);
    // Graceful fallback to local creation if backend encounters error
    return createMeetingLocal({
      meetingType: normalizedType,
      date: date.trim(),
      title: payload.title,
      setAsActive,
    });
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
    console.error("Backend setActive failed, updating locally:", err);
    setActiveMeetingLocal(id);
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
  try {
    const res = await hubDelete(`/super/admin/meetings/${id}`);
    deleteMeetingLocal(id);
    return res?.data || res;
  } catch (err) {
    console.error("Backend delete failed, deleting locally:", err);
    deleteMeetingLocal(id);
  }
}
