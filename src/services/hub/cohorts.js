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
