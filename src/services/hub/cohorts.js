import { hubGet, hubPost, hubPatch, hubDelete } from "./client";

export function fetchCohorts(params) {
  return hubGet("/cohorts", params);
}

export function createCohort(data) {
  return hubPost("/cohorts", data);
}

export function updateCohort(id, data) {
  return hubPatch(`/cohorts/${id}`, data);
}

export function deleteCohort(id) {
  return hubDelete(`/cohorts/${id}`);
}
