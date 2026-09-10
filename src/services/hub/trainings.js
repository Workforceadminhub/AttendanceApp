import { unwrapPaginated } from "../../utils/pagination.js";
import { hubGetPaged, hubGet, hubPost, hubPatch, hubDelete } from "./client";
import { sortById } from "./sortById";

export async function fetchTrainings(params) {
  const res = await hubGet("/trainings", params);
  const { data, pagination } = unwrapPaginated(res, { page: params?.page, limit: params?.limit ?? params?.per_page });
  return { ...res, data: sortById(data), pagination, total: pagination.total };
}

/** Fetch all trainings for pickers. */
export async function fetchAllTrainings(params) {
  const res = await hubGetPaged("/trainings", params);
  return { data: sortById(unwrapPaginated(res).data) };
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
  return hubGetPaged(`/trainings/${id}/enrollees`, params);
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
  return hubGetPaged(`/trainings/${id}/nominations`);
}

export function fetchMyNominations() {
  return hubGetPaged("/trainings/nominations/me");
}

export function acceptNomination(nominationId) {
  return hubPost(`/trainings/nominations/${nominationId}/accept`);
}

export function declineNomination(nominationId) {
  return hubPost(`/trainings/nominations/${nominationId}/decline`);
}

export function fetchRegistrationRequests(id) {
  return hubGetPaged(`/trainings/${id}/registration-requests`);
}

export function reviewRegistrationRequest(requestId, approved) {
  return hubPost(`/trainings/registration-requests/${requestId}/review`, { approved });
}

export function fetchSessions(id) {
  return hubGetPaged(`/trainings/${id}/sessions`);
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
  return hubGetPaged(`/trainings/${id}/curriculum`);
}

export function completeEnrollment(id, enrollmentId) {
  return hubPost(`/trainings/${id}/enrollments/${enrollmentId}/complete`);
}

export function fetchTrainingCertificates(id) {
  return hubGetPaged(`/trainings/${id}/certificates`);
}

export function fetchDeptAssignments(id) {
  return hubGetPaged(`/trainings/${id}/department-assignments`);
}

export function createDeptAssignment(id, data) {
  return hubPost(`/trainings/${id}/department-assignments`, data);
}

export function fetchWorkerTrainings(workerId) {
  return hubGetPaged(`/users/${workerId}/trainings`);
}

export function fetchWorkerTrainingMetrics(workerId) {
  return hubGet(`/users/${workerId}/training-metrics`);
}

// Progression Path Endpoints - the ordered chain a progressive training sits in.
export function fetchProgressionPaths() {
  return hubGetPaged("/progression-paths");
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
