import apiRequest from "../utils/apiClient";

/**
 * Compatibility helper for existing callers. Meeting session is no longer required for public attendance.
 */
export async function getMeetingSession(meetingType = "leaders", forceRefresh = false) {
  return "public";
}

/**
 * Searches workers for a meeting without requiring an auth/session token.
 * Supports both signatures:
 *   searchMeetingWorkers(name, date, meetingType)
 *   searchMeetingWorkers(name, token, date, meetingType)
 */
export async function searchMeetingWorkers(name, ...args) {
  let date, meetingType;
  if (args.length >= 3) {
    [, date, meetingType = "leaders"] = args;
  } else if (args.length === 2) {
    if (typeof args[0] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args[0])) {
      [date, meetingType = "leaders"] = args;
    } else {
      [, date] = args;
      meetingType = "leaders";
    }
  } else if (args.length === 1) {
    [date] = args;
    meetingType = "leaders";
  } else {
    meetingType = "leaders";
  }

  const endpoint = `/api/meeting/${meetingType}/workers/search`;
  const response = await apiRequest(
    "GET",
    endpoint,
    { name, date },
    undefined,
    false // public request - no Bearer token
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Search failed.");
  }
  return response.data ?? response;
}

/**
 * Adds a new worker and marks them for the meeting (public, no auth required).
 * Supports both:
 *   createMeetingWorker(data, meetingType)
 *   createMeetingWorker(data, token, meetingType)
 */
export async function createMeetingWorker(data, ...args) {
  let meetingType = "leaders";
  if (args.length === 2) {
    meetingType = args[1] || "leaders";
  } else if (args.length === 1) {
    meetingType = args[0] === "leaders" || args[0] === "workers" ? args[0] : "leaders";
  }

  const endpoint = `/api/meeting/${meetingType}/workers`;
  const response = await apiRequest(
    "POST",
    endpoint,
    data,
    undefined,
    false // public request
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to add worker.");
  }
  return response;
}

/**
 * Updates worker info / confirmation status for a meeting (public, no auth required).
 * Supports both:
 *   updateMeetingWorker(workerId, data, meetingType)
 *   updateMeetingWorker(workerId, data, token, meetingType)
 */
export async function updateMeetingWorker(workerId, data, ...args) {
  let meetingType = "leaders";
  if (args.length === 2) {
    meetingType = args[1] || "leaders";
  } else if (args.length === 1) {
    meetingType = args[0] === "leaders" || args[0] === "workers" ? args[0] : "leaders";
  }

  const endpoint = `/api/meeting/${meetingType}/workers/${workerId}`;
  const response = await apiRequest(
    "PUT",
    endpoint,
    data,
    undefined,
    false // public request
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Update failed.");
  }
  return response;
}

/**
 * Marks worker present for a meeting (public, no auth required).
 * Supports both:
 *   markMeetingWorkerPresent(workerId, data, meetingType)
 *   markMeetingWorkerPresent(workerId, data, token, meetingType)
 */
export async function markMeetingWorkerPresent(workerId, data, ...args) {
  let meetingType = "leaders";
  if (args.length === 2) {
    meetingType = args[1] || "leaders";
  } else if (args.length === 1) {
    meetingType = args[0] === "leaders" || args[0] === "workers" ? args[0] : "leaders";
  }

  const endpoint = `/api/meeting/${meetingType}/workers/${workerId}/present`;
  const response = await apiRequest(
    "POST",
    endpoint,
    data,
    undefined,
    false // public request
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to mark present.");
  }
  return response;
}

/**
 * Super Admin endpoints (auth required)
 */
export async function getMeetingRegistrations(meetingDate, status = "all", meetingType = "leaders") {
  const endpoint = `/api/super/admin/meeting/${meetingType}/registrations`;
  const response = await apiRequest(
    "GET",
    endpoint,
    { meeting_date: meetingDate, status },
    undefined,
    true
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to fetch registrations.");
  }
  return response;
}

export async function getMeetingRegistrationsSummary(meetingDate, meetingType = "leaders") {
  const endpoint = `/api/super/admin/meeting/${meetingType}/registrations/summary`;
  const response = await apiRequest(
    "GET",
    endpoint,
    { meeting_date: meetingDate },
    undefined,
    true
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to fetch meeting summary.");
  }
  return response;
}
