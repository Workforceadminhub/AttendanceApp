import { AWAKENING_ATTENDANCE_DAYS } from "./schemas";

const CURRENT_DAY_VALUES = new Set(
  AWAKENING_ATTENDANCE_DAYS.map(({ value }) => value)
);

const LEGACY_DAY_ALIASES = {
  day_1_wednesday_9_september: "wednesday_9th_september",
  day_2_thursday_10_september: "thursday_10th",
  day_3_friday_11_september: "friday_11th",
  day_4_sunday_13_september: "sunday_13th_september",
  wednesday_9_sept: "wednesday_9th_september",
  thursday_10_sept: "thursday_10th",
  thursday_10th_september: "thursday_10th",
  friday_11_sept: "friday_11th",
  friday_11th_september: "friday_11th",
  sunday_13_sept: "sunday_13th_september",
};

const SERVICE_TEAM_GROUPS = {
  Media: ["Media", "Photography", "Streaming", "Videography"],
  "Venue Management": ["Venue Management", "Venue Set up"],
  NextGen: ["NextGen", "Next Gen"],
};

const SERVICE_TEAM_ALIASES = Object.fromEntries(
  Object.entries(SERVICE_TEAM_GROUPS).flatMap(([normalized, values]) =>
    values.map((value) => [value.toLowerCase(), normalized])
  )
);

/**
 * Awakening shows one parent department for every specialist variant. The
 * source department list remains unchanged for the rest of the workers system.
 */
export function normalizeAwakeningDepartment(department) {
  const value = String(department ?? "").trim();

  if (/\s+-\s+kidszone$/i.test(value)) return "Kidszone";
  if (/\s+-\s+stir\s*house$/i.test(value)) return "Stirhouse";
  if (/^media-/i.test(value)) return "Media";
  if (/\bET$/i.test(value)) return "Exalted Tribe";

  return value.split(/\s+-\s+/)[0];
}

export function getAwakeningDepartmentOptions(departments) {
  return Array.from(
    new Set(
      departments
        .map((entry) => normalizeAwakeningDepartment(entry?.department ?? entry))
        .filter(Boolean)
    )
  ).sort();
}

/**
 * Present legacy service-team values under the current Awakening category
 * without altering the stored registration.
 */
export function normalizeAwakeningServiceTeam(serviceTeam) {
  const value = String(serviceTeam ?? "").trim();
  return SERVICE_TEAM_ALIASES[value.toLowerCase()] ?? value;
}

/**
 * Returns every persisted value represented by a selected current category.
 * This lets dashboard filters include registrations made before consolidation.
 */
export function getAwakeningServiceTeamQueryValues(serviceTeam) {
  const normalized = normalizeAwakeningServiceTeam(serviceTeam);
  return SERVICE_TEAM_GROUPS[normalized] ?? [serviceTeam];
}

function toDayArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(/[|;]/);
}

export function normalizeAwakeningDay(value) {
  return LEGACY_DAY_ALIASES[value] ?? value;
}

export function normalizeAwakeningDays(value) {
  return [
    ...new Set(
      toDayArray(value)
        .map((day) => normalizeAwakeningDay(String(day).trim().toLowerCase()))
        .filter((day) => CURRENT_DAY_VALUES.has(day))
    ),
  ];
}

export function formatAwakeningDays(value) {
  const labels = toDayArray(value)
    .map((day) => String(day).trim())
    .filter(Boolean)
    .map((day) => {
      const normalized = normalizeAwakeningDay(day);
      return (
        AWAKENING_ATTENDANCE_DAYS.find(({ value: option }) => option === normalized)
          ?.label ?? day
      );
    });

  return labels.join(", ") || "—";
}

export function buildAwakeningRegistrationPayload(data) {
  const isWorker = data.registration_type === "worker";
  const payload = {
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone,
    email: data.email,
    campus: data.campus,
    registration_type: data.registration_type,
    belongs_to_cell: data.belongs_to_cell,
    foundation_course_status: data.foundation_course_status,
    attendance_day: data.attendance_day,
    // The API requires both flags for every registration, including attendees.
    join_prayer_team: isWorker ? data.join_prayer_team : "no",
    lead_prayer_team: isWorker ? data.lead_prayer_team : "no",
  };

  if (data.belongs_to_cell === "yes") {
    payload.cell_designation = data.cell_designation;
  }

  if (isWorker) {
    payload.worker_team = data.worker_team;
    payload.department = data.department;
    payload.worker_designation = data.worker_designation;
    payload.preferred_service_team = data.preferred_service_team;
    payload.serving_day = data.serving_day;
  }

  return payload;
}
