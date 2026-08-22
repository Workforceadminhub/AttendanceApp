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

const phone = z
  .string()
  .min(1, "Phone is required")
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 11, "Phone must be exactly 11 digits");

const email = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email")
  .refine(
    (v) => /\.(com|org|net|co|io|edu|gov|info|biz|app|dev|ai|tech|africa|ng)$/i.test(v),
    "Email domain looks malformed"
  );

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
  { value: "day_1_wednesday_9_september", label: "Wed 9 September" },
  { value: "day_2_thursday_10_september", label: "Thu 10 September" },
  { value: "day_3_friday_11_september", label: "Fri 11 September" },
  { value: "day_4_sunday_13_september", label: "Sun 13 September" },
  { value: "all_days", label: "All Days" },
];

export const AWAKENING_SERVING_DAYS = [
  { value: "wednesday_9_sept", label: "Wed 9 Sept" },
  { value: "thursday_10_sept", label: "Thu 10 Sept" },
  { value: "friday_11_sept", label: "Fri 11 Sept" },
  { value: "sunday_13_sept", label: "Sun 13 Sept" },
  { value: "all_days", label: "All Days" },
];

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
const attendanceDayValues = AWAKENING_ATTENDANCE_DAYS.map((d) => d.value);
const servingDayValues = AWAKENING_SERVING_DAYS.map((d) => d.value);

export const awakeningRegistrationSchema = z
  .object({
    first_name: z.string().trim().min(2, "First name is required"),
    last_name: z.string().trim().min(2, "Last name is required"),
    phone,
    email,
    campus: z.enum(AWAKENING_CAMPUSES, { error: "Campus is required" }),
    registration_type: z.enum(["attendee", "worker"], {
      error: "Select how you want to join the conference",
    }),
    belongs_to_cell: yesNo("This field is required"),
    cell_designation: z.enum(AWAKENING_CELL_DESIGNATIONS).optional(),
    foundation_course_status: z.enum(
      ["yes", "no", "not_yet_but_would_love_to"],
      { error: "This field is required" }
    ),
    attendance_day: z
      .array(z.enum(attendanceDayValues))
      .min(1, "Select at least one day"),
    preferred_service_team: z.enum(AWAKENING_SERVICE_TEAMS).optional(),
    serving_day: z.enum(servingDayValues).optional(),
    join_prayer_team: yesNo("This field is required").optional(),
    lead_prayer_team: yesNo("This field is required").optional(),
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
      if (!data.preferred_service_team) {
        ctx.addIssue({
          code: "custom",
          path: ["preferred_service_team"],
          message: "Preferred service team is required",
        });
      }
      if (!data.serving_day) {
        ctx.addIssue({
          code: "custom",
          path: ["serving_day"],
          message: "Serving day is required",
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
