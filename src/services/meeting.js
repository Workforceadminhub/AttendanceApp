import apiRequest from "../utils/apiClient";

const activeSessionTokens = {};

function getOrCreateDeviceId() {
  const KEY = "meeting_device_id";
  let id = null;
  try {
    id = localStorage.getItem(KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(KEY, id);
    }
  } catch {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
  return id;
}

/**
 * Fetches (or returns cached) meeting session API key from /api/meeting/auth/session
 */
export async function getMeetingSession(meetingType = "leaders", forceRefresh = false) {
  if (!forceRefresh && activeSessionTokens[meetingType]) {
    return activeSessionTokens[meetingType];
  }
  const clientId = getOrCreateDeviceId();
  const response = await apiRequest(
    "POST",
    "/api/meeting/auth/session",
    { client_id: clientId, meeting_type: meetingType },
    undefined,
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || response?.message || "Failed to start meeting session.");
  }
  const apiKey = response.data?.api_key || response.api_key;
  if (!apiKey) {
    throw new Error("No API key in session response.");
  }
  activeSessionTokens[meetingType] = apiKey;
  return apiKey;
}

/**
 * Helper to execute meeting API call with transparent session key attachment and auto-refresh
 */
async function executeMeetingCall(meetingType, requestFn) {
  let keyToUse = await getMeetingSession(meetingType);
  try {
    return await requestFn(keyToUse);
  } catch (err) {
    const isSessionErr =
      err?.status === 401 ||
      err?.status === 403 ||
      /session|expired|unauthorized|api key|missing|invalid/i.test(err?.message || "");
    if (isSessionErr) {
      keyToUse = await getMeetingSession(meetingType, true);
      return await requestFn(keyToUse);
    }
    throw err;
  }
}

/**
 * Searches workers for a meeting. Transparently attaches x-api-key.
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
  return executeMeetingCall(meetingType, async (apiKey) => {
    const response = await apiRequest(
      "GET",
      endpoint,
      { name, date },
      { headers: { "x-api-key": apiKey } },
      false
    );
    if (!response || response.error) {
      throw new Error(response?.error || response?.message || "Search failed.");
    }
    return response.data ?? response;
  });
}

/**
 * Adds a new worker and marks them for the meeting. Transparently attaches x-api-key.
 */
export async function createMeetingWorker(data, ...args) {
  let meetingType = "leaders";
  if (args.length === 2) {
    meetingType = args[1] || "leaders";
  } else if (args.length === 1) {
    meetingType = args[0] === "leaders" || args[0] === "workers" ? args[0] : "leaders";
  }

  const endpoint = `/api/meeting/${meetingType}/workers`;
  return executeMeetingCall(meetingType, async (apiKey) => {
    const response = await apiRequest(
      "POST",
      endpoint,
      data,
      { headers: { "x-api-key": apiKey } },
      false
    );
    if (!response || response.error) {
      throw new Error(response?.error || response?.message || "Failed to add worker.");
    }
    return response;
  });
}

/**
 * Updates worker info / confirmation status for a meeting. Transparently attaches x-api-key.
 */
export async function updateMeetingWorker(workerId, data, ...args) {
  let meetingType = "leaders";
  if (args.length === 2) {
    meetingType = args[1] || "leaders";
  } else if (args.length === 1) {
    meetingType = args[0] === "leaders" || args[0] === "workers" ? args[0] : "leaders";
  }

  const endpoint = `/api/meeting/${meetingType}/workers/${workerId}`;
  return executeMeetingCall(meetingType, async (apiKey) => {
    const response = await apiRequest(
      "PUT",
      endpoint,
      data,
      { headers: { "x-api-key": apiKey } },
      false
    );
    if (!response || response.error) {
      throw new Error(response?.error || response?.message || "Update failed.");
    }
    return response;
  });
}

/**
 * Marks worker present for a meeting. Transparently attaches x-api-key.
 */
export async function markMeetingWorkerPresent(workerId, data, ...args) {
  let meetingType = "leaders";
  if (args.length === 2) {
    meetingType = args[1] || "leaders";
  } else if (args.length === 1) {
    meetingType = args[0] === "leaders" || args[0] === "workers" ? args[0] : "leaders";
  }

  const endpoint = `/api/meeting/${meetingType}/workers/${workerId}/present`;
  return executeMeetingCall(meetingType, async (apiKey) => {
    const response = await apiRequest(
      "POST",
      endpoint,
      data,
      { headers: { "x-api-key": apiKey } },
      false
    );
    if (!response || response.error) {
      throw new Error(response?.error || response?.message || "Failed to mark present.");
    }
    return response;
  });
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
