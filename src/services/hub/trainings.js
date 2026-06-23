import { hubGet, hubPost, hubPatch } from "./client";

export function fetchTrainings(params) {
  return hubGet("/trainings", params);
}

export function createTraining(data) {
  return hubPost("/trainings", data);
}

export function fetchTraining(id) {
  return hubGet(`/trainings/${id}`);
}

export function fetchEnrollees(id, params) {
  return hubGet(`/trainings/${id}/enrollees`, params);
}

export function registerForTraining(id, workerId) {
  const body = workerId ? { worker_id: workerId } : {};
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

export function fetchWorkerCurriculum(id) {
  return hubGet(`/trainings/${id}/worker-curriculum`);
}

export function addModule(id, title, sortOrder) {
  return hubPost(`/trainings/${id}/modules`, { title, sort_order: sortOrder });
}

export function addLesson(id, moduleId, data) {
  return hubPost(`/trainings/${id}/modules/${moduleId}/lessons`, data);
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

export function createStreamSession(id, data) {
  return hubPost(`/trainings/${id}/stream-sessions`, data);
}

export function updateStreamSession(id, sessionId, data) {
  return hubPatch(`/trainings/${id}/stream-sessions/${sessionId}`, data);
}

export function fetchRecordings(id, libraryOnly) {
  const params = libraryOnly ? { library_only: true } : {};
  return hubGet(`/trainings/${id}/recordings`, params);
}

export function addRecording(id, data) {
  return hubPost(`/trainings/${id}/recordings`, data);
}

export function fetchWorkerTrainings(workerId) {
  return hubGet(`/users/${workerId}/trainings`);
}

export function fetchWorkerTrainingMetrics(workerId) {
  return hubGet(`/users/${workerId}/training-metrics`);
}
