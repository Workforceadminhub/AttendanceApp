import apiRequest from "../utils/apiClient";

const activeSessionTokens = {};

function getOrCreateDeviceId() {
  const KEY = "meeting_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Fetches (or returns cached) meeting session API key
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
    throw new Error(response?.error || "Failed to start session.");
  }
  const apiKey = response.data?.api_key;
  if (!apiKey) throw new Error("No API key in session response.");
  activeSessionTokens[meetingType] = apiKey;
  return apiKey;
}

/**
 * Helper to execute meeting API call with automatic session token refresh on 401 / session error
 */
async function executeMeetingCall(meetingType, apiKey, requestFn) {
  let keyToUse = apiKey || (await getMeetingSession(meetingType));
  try {
    return await requestFn(keyToUse);
  } catch (err) {
    const isSessionErr =
      err?.status === 401 ||
      /session|expired|unauthorized|api key|token/i.test(err?.message || "");
    if (isSessionErr) {
      keyToUse = await getMeetingSession(meetingType, true);
      return await requestFn(keyToUse);
    }
    throw err;
  }
}

export async function searchMeetingWorkers(name, apiKey, date, meetingType = "leaders") {
  const endpoint = `/api/meeting/${meetingType}/workers/search`;
  return executeMeetingCall(meetingType, apiKey, async (key) => {
    const response = await apiRequest(
      "GET",
      endpoint,
      { name, date },
      { headers: { "x-api-key": key } },
      false
    );
    if (!response || response.error) {
      throw new Error(response?.error || "Search failed.");
    }
    return response.data ?? response;
  });
}

export async function createMeetingWorker(data, apiKey, meetingType = "leaders") {
  const endpoint = `/api/meeting/${meetingType}/workers`;
  return executeMeetingCall(meetingType, apiKey, async (key) => {
    const response = await apiRequest(
      "POST",
      endpoint,
      data,
      { headers: { "x-api-key": key } },
      false
    );
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to add worker.");
    }
    return response;
  });
}

export async function getMeetingRegistrations(meetingDate, status = "all", meetingType = "leaders") {
  const endpoint = `/api/super/admin/meeting/${meetingType}/registrations`;
  const response = await apiRequest(
    "GET",
    endpoint,
    { meeting_date: meetingDate, status }
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
    { meeting_date: meetingDate }
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to fetch meeting summary.");
  }
  return response;
}

export async function updateMeetingWorker(workerId, data, apiKey, meetingType = "leaders") {
  const endpoint = `/api/meeting/${meetingType}/workers/${workerId}`;
  return executeMeetingCall(meetingType, apiKey, async (key) => {
    const response = await apiRequest(
      "PUT",
      endpoint,
      data,
      { headers: { "x-api-key": key } },
      false
    );
    if (!response || response.error) {
      throw new Error(response?.error || "Update failed.");
    }
    return response;
  });
}

export async function markMeetingWorkerPresent(workerId, data, apiKey, meetingType = "leaders") {
  const endpoint = `/api/meeting/${meetingType}/workers/${workerId}/present`;
  return executeMeetingCall(meetingType, apiKey, async (key) => {
    const response = await apiRequest(
      "POST",
      endpoint,
      data,
      { headers: { "x-api-key": key } },
      false
    );
    if (!response || response.error) {
      throw new Error(response?.error || "Failed to mark present.");
    }
    return response;
  });
}
