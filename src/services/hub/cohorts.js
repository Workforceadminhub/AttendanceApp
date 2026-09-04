import { hubGet, hubPost, hubPatch, hubDelete } from "./client";
import { sortById } from "./sortById";

export async function fetchCohorts(params) {
  const res = await hubGet("/cohorts", params);
  if (Array.isArray(res)) return sortById(res);
  if (Array.isArray(res?.data)) {
    return { ...res, data: sortById(res.data) };
  }
  return res;
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
