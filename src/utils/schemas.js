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
  gender: z.enum(["Male", "Female"], { errorMap: () => ({ message: "Gender is required" }) }),
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
  sex: z.enum(["Male", "Female"], { errorMap: () => ({ message: "Sex is required" }) }),
  leadershipStatus: z.enum(["New Leader", "Existing Leader"], {
    errorMap: () => ({ message: "Leadership status is required" }),
  }),
  leadershipRole: z.string().optional(),
  campus: z.enum(
    ["Gbagada", "Magodo", "Ikorodu", "Jericho", "Yaba", "Ilupeju", "Akobo", "Port Harcourt", "Oluyole", "Surulere", "Ogba", "Toronto"],
    { errorMap: () => ({ message: "Campus is required" }) }
  ),
  course: z.enum(["BLC", "ALC"], { errorMap: () => ({ message: "Course is required" }) }),
});

const schemas = { workerSchema, departmentSchema, loginSchema, leadershipRegistrationSchema };
export default schemas;
