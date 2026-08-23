import { z } from "zod";

/**
 * Single source of truth for form/payload shapes.
 *
 * Usage with React Hook Form:
 *   import { useForm } from "react-hook-form";
 *   import { zodResolver } from "@hookform/resolvers/zod";
 *   import { workerSchema } from "../utils/schemas";
 *
 *   const form = useForm({ resolver: zodResolver(workerSchema) });
 *
 * As you migrate forms, replace the bespoke `if (!firstname) toast.error(...)`
 * blocks with this. Errors come back at form.formState.errors.<field>.message.
 */

// ── Shared field validators ───────────────────────────────────────────────────

// Exactly 11 digits after stripping formatting (+, spaces, dashes, parens).
// Shared worker and leadership APIs expect the local format.
const phone = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((v) => v.replace(/\D/g, ""))
  .refine(
    (v) => v.length === 11,
    "Phone number must be exactly 11 digits (e.g. 08012345678)"
  );

// Awakening accepts local and Nigerian international formats.
const awakeningPhone = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((v) => v.replace(/[\s\-().]/g, ""))
  .refine(
    (v) => /^(0\d{10}|\+234\d{10})$/.test(v),
    "Phone number must be 11 digits (e.g. 08012345678) or +234 format (e.g. +2348012345678)"
  );

const EMAIL_TLDS = [
  "com", "org", "net", "co", "io", "edu", "gov", "info", "biz", "app",
  "dev", "ai", "tech", "africa", "ng", "uk", "eu", "za", "gh", "ke", "us",
];

const email = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .refine((v) => v.includes("@"), "Email address must contain @")
  .refine(
    (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
    "Enter a valid email address (e.g. name@example.com)"
  )
  .refine(
    (v) => EMAIL_TLDS.includes(v.split(".").pop()?.toLowerCase() ?? ""),
    () => {
      const allowed = EMAIL_TLDS.slice(0, 6).map((t) => `.${t}`).join(", ");
      return `Email must end with an allowed domain such as ${allowed}…`;
    }
  );

/** Reusable plain-JS checks for places outside React Hook Form (admin modals, bulk flows). */
export const isValidPhone = (value) =>
  /^\d{11}$/.test((value ?? "").toString().replace(/\D/g, "").slice(-13));

export const isValidAwakeningPhone = (value) => {
  const normalized = (value ?? "").toString().trim().replace(/[\s\-().]/g, "");
  return /^(0\d{10}|\+234\d{10})$/.test(normalized);
};

export const isValidEmail = (value) => {
  const v = (value ?? "").toString().trim();
  return (
    v.includes("@") &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) &&
    EMAIL_TLDS.includes(v.split(".").pop()?.toLowerCase() ?? "")
  );
};

export const workerSchema = z.object({
  firstname: z.string().trim().min(1, "First name is required"),
  lastname: z.string().trim().min(1, "Last name is required"),
  othername: z.string().trim().optional().default(""),
  email,
  phonenumber: phone,
  gender: z.enum(["Male", "Female"], { error: "Gender is required" }),
  workerrole: z.string().trim().min(1, "Role is required"),
  birthdate: z.string().trim().min(1, "Birthdate is required"),
  maritalstatus: z.enum(["Single", "Married"]).optional(),
  agerange: z.string().optional(),
  employment: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required"),
  team: z.string().trim().min(1, "Team is required"),
  route: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? (v.startsWith("/") ? v : `/${v}`) : v)),
  code: z.string().trim().min(1, "Code is required"),
  isactive: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const leadershipRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email,
  phoneNumber: phone,
  sex: z.enum(["Male", "Female"], { error: "Sex is required" }),
  leadershipStatus: z.enum(["New Leader", "Existing Leader"], {
    error: "Leadership status is required",
  }),
  leadershipRole: z.string().optional(),
  campus: z.enum(
    ["Gbagada", "Magodo", "Ikorodu", "Jericho", "Yaba", "Ilupeju", "Akobo", "Port Harcourt", "Oluyole", "Surulere", "Ogba", "Toronto"],
    { error: "Campus is required" }
  ),
  course: z.enum(["BLC", "ALC"], { error: "Course is required" }),
});

// ── Awakening Conference ──────────────────────────────────────────────────────

export const AWAKENING_CAMPUSES = [
  "Gbagada", "Magodo", "Jericho", "Ikorodu", "Yaba", "Ilupeju",
  "PH", "Akobo", "New Lagos", "Abeokuta", "Apapa", "Surulere", "Oluyole", "Ogba",
];

export const AWAKENING_ATTENDANCE_DAYS = [
  { value: "wednesday_9th_september", label: "Wed 9 September" },
  { value: "thursday_10th", label: "Thu 10 September" },
  { value: "friday_11th", label: "Fri 11 September" },
  { value: "sunday_13th_september", label: "Sun 13 September" },
  { value: "all_days", label: "All Days" },
];

// Serving days share the conference-day slugs; sent as an array (multi-select)
export const AWAKENING_SERVING_DAYS = AWAKENING_ATTENDANCE_DAYS;

export const AWAKENING_SERVICE_TEAMS = [
  "Bus Mobilization", "Content Creation", "Crowd Control", "Event Experience",
  "Event Planning", "Facility & Maintenance", "Greeters", "Guest Welcome",
  "HIU", "Hospitality", "Medical Team", "Music", "Parking Hospitality",
  "Parking", "Photography", "Publicity", "Quality Assurance", "Registration",
  "Restrooms", "Shuttle Service", "Stage Management", "Streaming",
  "Testimonies", "Traffic", "Ushering", "Venue Set up", "Videography",
];

export const AWAKENING_CELL_DESIGNATIONS = [
  "Member", "Cell Leader", "Zonal Leader", "Community Leader", "District Pastor",
];

const yesNo = (message) => z.enum(["yes", "no"], { error: message });
const optionalWhenBlank = (schema) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
const attendanceDayValues = AWAKENING_ATTENDANCE_DAYS.map((d) => d.value);
const servingDayValues = AWAKENING_SERVING_DAYS.map((d) => d.value);

export const awakeningRegistrationSchema = z
  .object({
    first_name: z.string().trim().min(2, "First name is required"),
    last_name: z.string().trim().min(2, "Last name is required"),
    phone: awakeningPhone,
    email,
    campus: z.enum(AWAKENING_CAMPUSES, { error: "Campus is required" }),
    registration_type: z.enum(["attendee", "worker"], {
      error: "Select how you want to join the conference",
    }),
    belongs_to_cell: yesNo("This field is required"),
    cell_designation: optionalWhenBlank(z.enum(AWAKENING_CELL_DESIGNATIONS)),
    foundation_course_status: z.enum(
      ["yes", "no", "not_yet_but_would_love_to"],
      { error: "This field is required" }
    ),
    attendance_day: z
      .array(z.enum(attendanceDayValues))
      .min(1, "Select at least one day"),
    worker_team: z.string().trim().optional(),
    department: z.string().trim().optional(),
    worker_designation: z.string().trim().optional(),
    preferred_service_team: optionalWhenBlank(z.enum(AWAKENING_SERVICE_TEAMS)),
    serving_day: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.array(z.enum(servingDayValues)).optional()
    ),
    join_prayer_team: optionalWhenBlank(yesNo("This field is required")),
    lead_prayer_team: optionalWhenBlank(yesNo("This field is required")),
  })
  .superRefine((data, ctx) => {
    if (data.belongs_to_cell === "yes" && !data.cell_designation) {
      ctx.addIssue({
        code: "custom",
        path: ["cell_designation"],
        message: "Cell designation is required",
      });
    }
    if (data.registration_type === "worker") {
      if (!data.worker_team) {
        ctx.addIssue({
          code: "custom",
          path: ["worker_team"],
          message: "Worker team is required",
        });
      }
      if (!data.department) {
        ctx.addIssue({
          code: "custom",
          path: ["department"],
          message: "Department is required",
        });
      }
      if (!data.worker_designation) {
        ctx.addIssue({
          code: "custom",
          path: ["worker_designation"],
          message: "Worker designation is required",
        });
      }
      if (!data.preferred_service_team) {
        ctx.addIssue({
          code: "custom",
          path: ["preferred_service_team"],
          message: "Preferred service team is required",
        });
      }
      if (!data.serving_day?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["serving_day"],
          message: "Select at least one serving day",
        });
      }
      if (!data.join_prayer_team) {
        ctx.addIssue({
          code: "custom",
          path: ["join_prayer_team"],
          message: "This field is required",
        });
      }
      if (!data.lead_prayer_team) {
        ctx.addIssue({
          code: "custom",
          path: ["lead_prayer_team"],
          message: "This field is required",
        });
      }
    }
  });

const schemas = { workerSchema, departmentSchema, loginSchema, leadershipRegistrationSchema, awakeningRegistrationSchema };
export default schemas;
