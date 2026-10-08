const PRESENT_STATUSES = new Set(["Present", "Online"]);

/** Which summary count an attendance status falls under. */
const countFor = (status) => {
  const value = (status || "").toString().trim();
  if (!value) return "unmarked";
  return PRESENT_STATUSES.has(value) ? "present" : "absent";
};

/**
 * Adds unsaved picks to the counts from the server. `pickedFrom` maps a
 * worker id to the status they had when first picked and the summary scope
 * they were picked in. Picks from another scope are left out, since that
 * worker may not be in this one.
 */
export function applyPendingPicks(counts, picks, pickedFrom, scope) {
  const next = { ...counts };
  for (const { workerid, attendance } of picks) {
    const from = pickedFrom.get(workerid);
    if (!from || from.scope !== scope) continue;
    next[countFor(from.status)] -= 1;
    next[countFor(attendance)] += 1;
  }
  return next;
}
