import { hubGet, hubPost, hubPut } from "./client";

export function fetchCourses(params) {
  return hubGet("/courses", params);
}

export function createCourse(data) {
  return hubPost("/courses", data);
}

export function fetchCourse(id) {
  return hubGet(`/courses/${id}`);
}

export function updateCourse(id, data) {
  return hubPut(`/courses/${id}`, data);
}

export function fetchCourseCurriculum(id) {
  return hubGet(`/courses/${id}/curriculum`);
}

export function addSection(id, title, sortOrder) {
  return hubPost(`/courses/${id}/sections`, { title, sort_order: sortOrder });
}

export function addLecture(sectionId, data) {
  return hubPost(`/courses/sections/${sectionId}/lectures`, data);
}

export function enrollInCourse(id, workerId) {
  const body = workerId ? { worker_id: workerId } : {};
  return hubPost(`/courses/${id}/enroll`, body);
}

export function fetchEnrollments(id) {
  return hubGet(`/courses/${id}/enrollments`);
}

export function completeLecture(enrollmentId, lectureId) {
  return hubPost(`/courses/enrollments/${enrollmentId}/lectures/${lectureId}/complete`);
}

export function fetchWorkerCourses(workerId) {
  return hubGet(`/users/${workerId}/courses`);
}
