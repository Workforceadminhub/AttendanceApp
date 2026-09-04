import { hubGet, hubPost } from "./client";

export function fetchCourses(params) {
  return hubGet("/courses", params);
}

export function createCourse(data) {
  return hubPost("/courses", data);
}

export function fetchCourse(id) {
  return hubGet(`/courses/${id}`);
}

export function fetchCourseCurriculum(id) {
  return hubGet(`/courses/${id}/curriculum`);
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
