import { unwrapPaginated } from "../../utils/pagination.js";
import { hubGetPaged, hubGet, hubPost } from "./client";

export async function fetchCourses(params) {
  const res = await hubGet("/courses", params);
  const { data, pagination } = unwrapPaginated(res, { page: params?.page, limit: params?.limit ?? params?.per_page });
  return { ...res, data, pagination, total: pagination.total };
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
  return hubGetPaged(`/courses/${id}/enrollments`);
}

export function completeLecture(enrollmentId, lectureId) {
  return hubPost(`/courses/enrollments/${enrollmentId}/lectures/${lectureId}/complete`);
}
