import { hubGet, hubPost, hubPatch, hubDelete } from "./client";

function sortById(items) {
  if (!Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    const idA = a?.id ?? a?._id;
    const idB = b?.id ?? b?._id;
    const numA = Number(idA);
    const numB = Number(idB);
    if (!isNaN(numA) && !isNaN(numB) && idA !== null && idB !== null && idA !== "" && idB !== "") {
      return numA - numB;
    }
    return String(idA ?? "").localeCompare(String(idB ?? ""));
  });
}

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
