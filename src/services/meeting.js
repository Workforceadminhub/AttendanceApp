import apiRequest from "../utils/apiClient";

function getOrCreateDeviceId() {
  const KEY = "meeting_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export async function getMeetingSession(meetingType = "leaders") {
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
  return apiKey;
}

export async function searchMeetingWorkers(name, apiKey, date, meetingType = "leaders") {
  const endpoint = `/api/meeting/${meetingType}/workers/search`;
  const response = await apiRequest(
    "GET",
    endpoint,
    { name, date },
    { headers: { "x-api-key": apiKey } },
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Search failed.");
  }
  return response.data ?? response;
}

export async function createMeetingWorker(data, apiKey, meetingType = "leaders") {
  const endpoint = `/api/meeting/${meetingType}/workers`;
  const response = await apiRequest(
    "POST",
    endpoint,
    data,
    { headers: { "x-api-key": apiKey } },
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to add worker.");
  }
  return response;
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
  const response = await apiRequest(
    "PUT",
    endpoint,
    data,
    { headers: { "x-api-key": apiKey } },
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Update failed.");
  }
  return response;
}

export async function markMeetingWorkerPresent(workerId, data, apiKey, meetingType = "leaders") {
  const endpoint = `/api/meeting/${meetingType}/workers/${workerId}/present`;
  const response = await apiRequest(
    "POST",
    endpoint,
    data,
    { headers: { "x-api-key": apiKey } },
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to mark present.");
  }
  return response;
}
