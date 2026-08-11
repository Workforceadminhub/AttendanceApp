import { hubGet } from "./client";

/**
 * Normalize a /api/hub/teams payload into a sorted list of
 * { value, label } options for selects.
 */
export function normalizeTeamOptions(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.teams)
        ? raw.teams
        : Array.isArray(raw?.data?.teams)
          ? raw.data.teams
          : [];

  const byValue = new Map();
  list.forEach((item) => {
    if (item == null) return;
    if (typeof item === "string" || typeof item === "number") {
      const name = String(item).trim();
      const norm = name.toLowerCase();
      if (name && norm !== "gbagada campus" && norm !== "gbagada") {
        byValue.set(name, { value: name, label: name });
      }
      return;
    }

    const value = String(
      item.name ?? item.team ?? item.team_name ?? item.title ?? item.label ?? item.value ?? ""
    ).trim();
    if (!value) return;

    const normVal = value.toLowerCase();
    if (normVal === "gbagada campus" || normVal === "gbagada") return;

    const label = String(
      item.label ?? item.display_name ?? item.displayName ?? value
    ).trim();
    if (label.toLowerCase() === "gbagada campus" || label.toLowerCase() === "gbagada") return;

    byValue.set(value, { value, label: label || value });
  });

  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * GET /api/hub/teams
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function fetchHubTeams() {
  const response = await hubGet("/teams");
  if (!response || response.error) {
    throw new Error(response?.error || response?.message || "Failed to fetch teams");
  }
  return normalizeTeamOptions(response);
}
