import { format } from "date-fns";

export const PAGE_SIZE = 25;

export function formatDateSafe(raw, pattern = "dd MMM yyyy, h:mm a") {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "-" : format(d, pattern);
  } catch {
    return "-";
  }
}

/**
 * Multi-word search matcher: every space-separated token in `query` must appear
 * somewhere in the worker's searchable fields (so "grace nw" matches "Grace Chizoba Nwannukwu").
 */
export function matchesMultiWordSearch(record, query) {
  const cleaned = String(query || "").trim().toLowerCase();
  if (!cleaned) return true;

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = [
    record?.name,
    record?.firstName,
    record?.lastName,
    record?.code,
    record?.accessCode,
    record?.email,
    record?.phone,
    record?.role,
    record?.department,
    record?.team,
    record?.status,
    record?.workerId,
    record?.id,
  ]
    .filter((v) => v !== null && v !== undefined && v !== "")
    .join(" ")
    .toLowerCase();

  return tokens.every((tok) => haystack.includes(tok));
}
