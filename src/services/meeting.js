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

export async function getMeetingSession() {
  const clientId = getOrCreateDeviceId();
  const response = await apiRequest(
    "POST",
    "/api/meeting/auth/session",
    { client_id: clientId, meeting_type: "leaders" },
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

export async function searchMeetingWorkers(name, apiKey) {
  const response = await apiRequest(
    "GET",
    "/api/meeting/leaders/workers/search",
    { name },
    { headers: { "x-api-key": apiKey } },
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Search failed.");
  }
  return response.data ?? response;
}

export async function createMeetingWorker(data, apiKey) {
  const response = await apiRequest(
    "POST",
    "/api/meeting/leaders/workers",
    data,
    { headers: { "x-api-key": apiKey } },
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Failed to add worker.");
  }
  return response;
}

export async function updateMeetingWorker(workerId, data, apiKey) {
  const response = await apiRequest(
    "PUT",
    `/api/meeting/leaders/workers/${workerId}`,
    data,
    { headers: { "x-api-key": apiKey } },
    false
  );
  if (!response || response.error) {
    throw new Error(response?.error || "Update failed.");
  }
  return response;
}
