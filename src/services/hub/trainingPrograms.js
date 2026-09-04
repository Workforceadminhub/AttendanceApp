import { hubGet, hubPost, hubPatch, hubDelete } from "./client";
import { sortById } from "./sortById";

export async function fetchTrainingPrograms(params) {
  const res = await hubGet("/training-programs", params);
  if (Array.isArray(res)) return sortById(res);
  if (Array.isArray(res?.data)) {
    return { ...res, data: sortById(res.data) };
  }
  return res;
}


export function createTrainingProgram(data) {
  return hubPost("/training-programs", data);
}

export function updateTrainingProgram(id, data) {
  return hubPatch(`/training-programs/${id}`, data);
}

export function deleteTrainingProgram(id) {
  return hubDelete(`/training-programs/${id}`);
}
