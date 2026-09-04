import { hubGet, hubPost, hubPatch, hubDelete } from "./client";
import { sortById } from "./sortById";

export async function fetchTrainings(params) {
  const res = await hubGet("/trainings", params);
  if (Array.isArray(res)) return sortById(res);
  if (Array.isArray(res?.data)) {
    return { ...res, data: sortById(res.data) };
  }
  return res;
}


export function createTraining(data) {
  return hubPost("/trainings", data);
}

export function updateTraining(id, data) {
  return hubPatch(`/trainings/${id}`, data);
}

export function fetchTraining(id) {
  return hubGet(`/trainings/${id}`);
}

export function fetchEnrollees(id, params) {
  return hubGet(`/trainings/${id}/enrollees`, params);
}

export function registerForTraining(id, workerId, options = {}) {
  const body = workerId ? { worker_id: workerId } : {};
  // A refresher retake is flagged so it is not counted as a new completion.
  if (options.refresher) body.enrollment_type = "refresher";
  return hubPost(`/trainings/${id}/register`, body);
}

export function nominateWorkers(id, workerIds, expiresInDays) {
  const body = { worker_ids: workerIds };
  if (expiresInDays) body.expires_in_days = expiresInDays;
  return hubPost(`/trainings/${id}/nominate`, body);
}

export function fetchNominations(id) {
  return hubGet(`/trainings/${id}/nominations`);
}

export function fetchMyNominations() {
  return hubGet("/trainings/nominations/me");
}

export function acceptNomination(nominationId) {
  return hubPost(`/trainings/nominations/${nominationId}/accept`);
}

export function declineNomination(nominationId) {
  return hubPost(`/trainings/nominations/${nominationId}/decline`);
}

export function fetchRegistrationRequests(id) {
  return hubGet(`/trainings/${id}/registration-requests`);
}

export function reviewRegistrationRequest(requestId, approved) {
  return hubPost(`/trainings/registration-requests/${requestId}/review`, { approved });
}

export function fetchSessions(id) {
  return hubGet(`/trainings/${id}/sessions`);
}

export function addSession(id, sessionDate, label) {
  const body = { session_date: sessionDate };
  if (label) body.label = label;
  return hubPost(`/trainings/${id}/sessions`, body);
}

export function markParticipation(id, workerId, sessionDate, status) {
  return hubPost(`/trainings/${id}/participation`, {
    worker_id: workerId,
    session_date: sessionDate,
    status,
  });
}

export function fetchCurriculum(id) {
  return hubGet(`/trainings/${id}/curriculum`);
}

export function completeEnrollment(id, enrollmentId) {
  return hubPost(`/trainings/${id}/enrollments/${enrollmentId}/complete`);
}

export function fetchTrainingCertificates(id) {
  return hubGet(`/trainings/${id}/certificates`);
}

export function fetchDeptAssignments(id) {
  return hubGet(`/trainings/${id}/department-assignments`);
}

export function createDeptAssignment(id, data) {
  return hubPost(`/trainings/${id}/department-assignments`, data);
}

export function fetchWorkerTrainings(workerId) {
  return hubGet(`/users/${workerId}/trainings`);
}

export function fetchWorkerTrainingMetrics(workerId) {
  return hubGet(`/users/${workerId}/training-metrics`);
}

// Progression Path Endpoints - the ordered chain a progressive training sits in.
export function fetchProgressionPaths() {
  return hubGet("/progression-paths");
}

export function createProgressionPath(data) {
  return hubPost("/progression-paths", data);
}

export function updateProgressionPath(id, data) {
  return hubPatch(`/progression-paths/${id}`, data);
}

export function deleteProgressionPath(id) {
  return hubDelete(`/progression-paths/${id}`);
}
