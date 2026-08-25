/**
 * Shared helpers for the Training Hub (Training Management + Certificate Engine).
 *
 * The hub API is not uniform: list endpoints return `{ data: [...] }` while
 * `GET /trainings/:id` returns `{ data: { training, enrollees, participation, ... } }`.
 * Everything here normalises those shapes so pages can read plain objects.
 */

/** Unwraps a `{ data }` envelope, tolerating already-unwrapped values. */
export function unwrapData(response) {
  return response?.data ?? response ?? null;
}

/**
 * `GET /trainings/:id` nests the record under `data.training` and returns the
 * related collections alongside it. Reading `data.name` directly yields
 * undefined, so always go through this.
 */
export function unwrapTrainingDetail(response) {
  const payload = unwrapData(response);
  if (!payload) return null;
  const training = payload.training ?? payload;
  return {
    training,
    curriculum: payload.curriculum ?? [],
    enrollees: payload.enrollees ?? [],
    participation: payload.participation ?? [],
    nominations: payload.nominations ?? [],
    departmentAssignments: payload.department_assignments ?? [],
    streamSessions: payload.stream_sessions ?? [],
    recordings: payload.recordings ?? [],
  };
}

/** Classification — drives progression locks and tracker visibility everywhere. */
export const TRAINING_KIND = {
  STANDALONE: "standalone",
  PROGRESSIVE: "progressive",
};

export function trainingKind(training) {
  return String(training?.training_kind ?? TRAINING_KIND.STANDALONE).toLowerCase();
}

export function isProgressive(training) {
  return trainingKind(training) === TRAINING_KIND.PROGRESSIVE;
}

export function kindLabel(training) {
  return isProgressive(training) ? "Progressive" : "Standalone";
}

/** Quiet Cockpit tone for a training status. Sienna is reserved for "ongoing". */
export const STATUS_TONE = {
  ongoing: "live",
  upcoming: "warning",
  completed: "success",
};

export function statusTone(status) {
  return STATUS_TONE[String(status ?? "").toLowerCase()] ?? "neutral";
}

/**
 * The list endpoint returns `status`, but `GET /trainings/:id` does not, so
 * derive it from the date range whenever the API leaves it out.
 */
export function trainingStatus(training, { now = new Date() } = {}) {
  const given = String(training?.status ?? "").toLowerCase();
  if (given) return given;
  const today = asDate(now.toISOString());
  const start = asDate(training?.start_date);
  const end = asDate(training?.end_date);
  if (start && today < start) return "upcoming";
  if (end && today > end) return "completed";
  if (start || end) return "ongoing";
  return "upcoming";
}

/** ISO timestamp → `YYYY-MM-DD`, the form/table format used across the hub. */
export function asDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

/** Inclusive, human-readable duration derived from the scheduled dates. */
export function durationFromDates(startDate, endDate) {
  const start = asDate(startDate);
  const end = asDate(endDate);
  if (!start || !end || end < start) return "";
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  const days = Math.round((endMs - startMs) / 86400000) + 1;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Handles both list and detail API enrolment counts. */
export function isTrainingFull(training, enrollees = []) {
  const capacity = Number(training?.capacity ?? 0);
  if (!Number.isFinite(capacity) || capacity <= 0) return false;
  const count = Number(training?.number_of_enrollees ?? training?.enrollee_count ?? enrollees.length);
  return Number.isFinite(count) && count >= capacity;
}

/** ISO timestamp → `21 Aug 2026`. Returns a plain hyphen when empty. */
export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Empty values display as a plain hyphen. */
export function display(value, fallback = "-") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

export function initials(name) {
  return String(name || "Worker")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Enrollee/worker records come back under several different key names. */
export function workerIdOf(record) {
  return record?.worker_id ?? record?.workerId ?? record?.id ?? null;
}

export function workerNameOf(record) {
  const composed = `${record?.firstname ?? ""} ${record?.lastname ?? ""}`.trim();
  return (
    record?.worker_name ??
    record?.fullname ??
    record?.name ??
    (composed || `Worker ${workerIdOf(record) ?? ""}`.trim())
  );
}

/**
 * The next session on or after today, used by the training list.
 * Sessions arrive unsorted, so pick the minimum future date rather than [0].
 */
export function nextSessionDate(sessions, { from = new Date() } = {}) {
  const dates = (sessions ?? [])
    .map((session) => asDate(session?.session_date ?? session?.date))
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return null;
  const today = asDate(from.toISOString());
  return dates.find((date) => date >= today) ?? null;
}

/**
 * Completion rule (BE-T7): a worker completes only when present for 100% of
 * sessions. Anything less — including unmarked sessions — is in progress.
 */
export function completionFor(workerId, sessions, participation) {
  const sessionDates = (sessions ?? [])
    .map((session) => asDate(session?.session_date ?? session?.date))
    .filter(Boolean);

  if (sessionDates.length === 0) {
    return { total: 0, present: 0, marked: 0, percent: 0, complete: false };
  }

  const byDate = new Map();
  (participation ?? []).forEach((record) => {
    if (String(workerIdOf(record)) !== String(workerId)) return;
    const date = asDate(record?.session_date ?? record?.date);
    if (date) byDate.set(date, String(record?.status ?? "").toLowerCase());
  });

  let present = 0;
  let marked = 0;
  sessionDates.forEach((date) => {
    const status = byDate.get(date);
    if (!status) return;
    marked += 1;
    if (status === "present") present += 1;
  });

  return {
    total: sessionDates.length,
    present,
    marked,
    percent: Math.round((present / sessionDates.length) * 100),
    complete: present === sessionDates.length,
  };
}

/** Bar colour for a completion/participation percentage. */
export function progressTone(percent) {
  if (percent >= 100) return { bar: "bg-forest", text: "text-forest" };
  if (percent >= 60) return { bar: "bg-mustard", text: "text-mustard" };
  return { bar: "bg-brick", text: "text-brick" };
}

/** The five progression states a worker can sit in on a pathway (FE-T10). */
export const PROGRESSION_STATE = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED_SERVING: "completed_serving",
  ELIGIBLE: "eligible",
  COMPLETE: "complete",
};

export const PROGRESSION_STATE_LABEL = {
  [PROGRESSION_STATE.NOT_STARTED]: "Not started",
  [PROGRESSION_STATE.IN_PROGRESS]: "In progress",
  [PROGRESSION_STATE.COMPLETED_SERVING]: "Completed - serving",
  [PROGRESSION_STATE.ELIGIBLE]: "Eligible for next level",
  [PROGRESSION_STATE.COMPLETE]: "Pathway complete",
};

export const PROGRESSION_STATE_TONE = {
  [PROGRESSION_STATE.NOT_STARTED]: "neutral",
  [PROGRESSION_STATE.IN_PROGRESS]: "live",
  [PROGRESSION_STATE.COMPLETED_SERVING]: "warning",
  [PROGRESSION_STATE.ELIGIBLE]: "success",
  [PROGRESSION_STATE.COMPLETE]: "success",
};

/** Participation threshold a worker must hold to unlock the next level. */
export const PARTICIPATION_THRESHOLD = 80;

/**
 * A worker may only enrol in the next level once they have completed the
 * current one, served the required time, and met the participation threshold.
 */
export function isEligibleForNextLevel(assignment) {
  if (!assignment) return false;
  const served = Number(assignment.served_days ?? assignment.served_duration_days ?? 0);
  const required = Number(assignment.required_duration_days ?? 0);
  const participation = Number(assignment.participation_rate ?? assignment.participation_pct ?? 0);
  if (!required) return false;
  return served >= required && participation >= PARTICIPATION_THRESHOLD;
}

/** Days elapsed since an assignment start date, floored at 0. */
export function daysServed(startDate, { to = new Date() } = {}) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 0;
  const diff = Math.floor((to.getTime() - start.getTime()) / 86400000);
  return Math.max(0, diff);
}
