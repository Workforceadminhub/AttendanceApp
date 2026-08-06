import { hubGet, hubPost, hubPatch, hubDelete } from "./client";

export function fetchTrainingPrograms(params) {
  return hubGet("/training-programs", params);
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
