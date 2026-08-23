import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "react-toastify";
import {
  awakeningRegistrationSchema,
  AWAKENING_CAMPUSES,
  AWAKENING_ATTENDANCE_DAYS,
  AWAKENING_SERVING_DAYS,
  AWAKENING_SERVICE_TEAMS,
  AWAKENING_CELL_DESIGNATIONS,
} from "../utils/schemas";
import { submitAwakeningRegistration } from "../services/awakeningConference";
import { buildAwakeningRegistrationPayload } from "../utils/awakeningRegistration";
import { PUBLIC_SUBMIT_ERROR } from "../utils/safeMessages";
import { getEffectiveRouteList } from "../utils/routeObject";
import { teams, workerRoles } from "../utils/teams";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

const DEPARTMENT_OPTIONS = Array.from(
  new Set(getEffectiveRouteList().map((d) => d.department).filter(Boolean))
).sort();
const TEAM_OPTIONS = teams.map((t) => t.value);

// ── Small helpers ─────────────────────────────────────────────────────────────

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-sienna">{message}</p>;
}

function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink mb-1">
      {children}
      {required && <span className="text-sienna ml-0.5">*</span>}
    </label>
  );
}

function YesNoGroup({ name, value, onChange, error }) {
  const options = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  return (
    <div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              value === opt.value
                ? "border-ink bg-ink text-cream"
                : "border-ink-200 bg-white text-ink hover:bg-ink-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition";
const selectClass = `${inputClass} appearance-none`;

// ── Registration form ────────────────────────────────────────────────────────

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(awakeningRegistrationSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      campus: "",
      registration_type: "",
      belongs_to_cell: "",
      cell_designation: "",
      foundation_course_status: "",
      attendance_day: [],
      worker_team: "",
      department: "",
      worker_designation: "",
      preferred_service_team: "",
      serving_day: [],
      join_prayer_team: "",
      lead_prayer_team: "",
    },
  });

  const [submitted, setSubmitted] = useState(false);

  const registrationType = watch("registration_type");
  const belongsToCell = watch("belongs_to_cell");
  const isWorker = registrationType === "worker";

  const onSubmit = async (data) => {
    try {
      const payload = buildAwakeningRegistrationPayload(data);
      await submitAwakeningRegistration(payload);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err?.message || PUBLIC_SUBMIT_ERROR);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircleIcon className="mx-auto h-14 w-14 text-forest" />
        <h2 className="text-2xl font-semibold text-ink">Registration Received</h2>
        <p className="text-sm text-ink-500 leading-relaxed max-w-sm mx-auto">
          Thank you for registering for Awakening. We will be in touch with further details.
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            setSubmitted(false);
          }}
          className="mt-2 text-sm font-medium text-ink underline underline-offset-2 hover:text-ink/70 transition"
        >
          Register another person
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Personal details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name" required>First Name</Label>
          <input id="first_name" type="text" placeholder="e.g. Ada" className={inputClass}
            {...register("first_name")} />
          <FieldError message={errors.first_name?.message} />
        </div>
        <div>
          <Label htmlFor="last_name" required>Last Name</Label>
          <input id="last_name" type="text" placeholder="e.g. Okafor" className={inputClass}
            {...register("last_name")} />
          <FieldError message={errors.last_name?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone" required>Phone Number</Label>
          <input
            id="phone"
            type="tel"
            placeholder="08012345678 or +2348012345678"
            maxLength={14}
            className={inputClass}
            {...register("phone", {
              onChange: (e) => {
                const cleaned = e.target.value.replace(/[^\d+]/g, "");
                const prefix = cleaned.startsWith("+") ? "+" : "";
                e.target.value = `${prefix}${cleaned.replace(/\+/g, "").slice(0, 13)}`;
              },
            })}
          />
          <FieldError message={errors.phone?.message} />
        </div>
        <div>
          <Label htmlFor="email" required>Email Address</Label>
          <input id="email" type="email" placeholder="you@example.com" className={inputClass}
            {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="campus" required>Campus</Label>
          <Controller name="campus" control={control} render={({ field }) => (
            <select id="campus" className={selectClass} {...field}>
              <option value="">Select campus</option>
              {AWAKENING_CAMPUSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          )} />
          <FieldError message={errors.campus?.message} />
        </div>

        <div>
          <Label htmlFor="registration_type" required>I am registering as</Label>
          <Controller name="registration_type" control={control} render={({ field }) => (
            <select id="registration_type" className={selectClass} {...field}>
              <option value="">Select</option>
              <option value="attendee">Attendee</option>
              <option value="worker">Worker / Volunteer</option>
            </select>
          )} />
          <FieldError message={errors.registration_type?.message} />
        </div>
      </div>

      {/* Cell membership */}
      <div className="rounded-xl border border-ink-200 p-4 space-y-4">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-500">Cell Group</p>
        <div>
          <Label>Do you belong to a cell group?</Label>
          <Controller name="belongs_to_cell" control={control} render={({ field }) => (
            <YesNoGroup name="belongs_to_cell" value={field.value} onChange={field.onChange}
              error={errors.belongs_to_cell?.message} />
          )} />
        </div>
        {belongsToCell === "yes" && (
          <div>
            <Label htmlFor="cell_designation" required>Cell Designation</Label>
            <Controller name="cell_designation" control={control} render={({ field }) => (
              <select id="cell_designation" className={selectClass} {...field}>
                <option value="">Select designation</option>
                {AWAKENING_CELL_DESIGNATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            )} />
            <FieldError message={errors.cell_designation?.message} />
          </div>
        )}
      </div>

      {/* Foundation course */}
      <div>
        <Label htmlFor="foundation_course_status" required>Foundation School Status</Label>
        <p className="text-xs text-ink-500 mb-2">Have you completed the Foundation Course?</p>
        <Controller name="foundation_course_status" control={control} render={({ field }) => (
          <select id="foundation_course_status" className={selectClass} {...field}>
            <option value="">Select status</option>
            <option value="yes">Yes, completed</option>
            <option value="no">No</option>
            <option value="not_yet_but_would_love_to">Not yet, but I would love to</option>
          </select>
        )} />
        <FieldError message={errors.foundation_course_status?.message} />
      </div>

      {/* Attendance days — everyone attends */}
      <div>
        <Label required>Days Attending</Label>
        <p className="text-xs text-ink-500 mb-2">Select all that apply.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AWAKENING_ATTENDANCE_DAYS.map((day) => (
            <label key={day.value}
              className="flex items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink cursor-pointer transition hover:bg-ink-100">
              <input type="checkbox" value={day.value} className="h-4 w-4 accent-current"
                {...register("attendance_day")} />
              {day.label}
            </label>
          ))}
        </div>
        <FieldError message={errors.attendance_day?.message} />
      </div>

      {/* Worker / volunteer section */}
      {isWorker && (
        <div className="rounded-xl border border-ink-200 p-4 space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-ink-500">
            Serving Details
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="worker_team" required>Worker Team</Label>
              <Controller name="worker_team" control={control} render={({ field }) => (
                <select id="worker_team" className={selectClass} {...field}>
                  <option value="">Select team</option>
                  {TEAM_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              )} />
              <FieldError message={errors.worker_team?.message} />
            </div>

            <div>
              <Label htmlFor="department" required>Department</Label>
              <Controller name="department" control={control} render={({ field }) => (
                <select id="department" className={selectClass} {...field}>
                  <option value="">Select department</option>
                  {DEPARTMENT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
              )} />
              <FieldError message={errors.department?.message} />
            </div>

            <div>
              <Label htmlFor="worker_designation" required>Worker Designation</Label>
              <Controller name="worker_designation" control={control} render={({ field }) => (
                <select id="worker_designation" className={selectClass} {...field}>
                  <option value="">Select designation</option>
                  {workerRoles.map((r) => <option key={r}>{r}</option>)}
                </select>
              )} />
              <FieldError message={errors.worker_designation?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="preferred_service_team" required>Preferred Service Team</Label>
            <Controller name="preferred_service_team" control={control} render={({ field }) => (
              <select id="preferred_service_team" className={selectClass} {...field}>
                <option value="">Select team</option>
                {AWAKENING_SERVICE_TEAMS.map((t) => <option key={t}>{t}</option>)}
              </select>
            )} />
            <FieldError message={errors.preferred_service_team?.message} />
          </div>

          <div>
            <Label required>Preferred Serving Days</Label>
            <p className="text-xs text-ink-500 mb-2">Select all that apply.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AWAKENING_SERVING_DAYS.map((day) => (
                <label key={day.value}
                  className="flex items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink cursor-pointer transition hover:bg-ink-100">
                  <input type="checkbox" value={day.value} className="h-4 w-4 accent-current"
                    {...register("serving_day")} />
                  {day.label}
                </label>
              ))}
            </div>
            <FieldError message={errors.serving_day?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Join the Prayer Team?</Label>
              <Controller name="join_prayer_team" control={control} render={({ field }) => (
                <YesNoGroup name="join_prayer_team" value={field.value} onChange={field.onChange}
                  error={errors.join_prayer_team?.message} />
              )} />
            </div>
            <div>
              <Label>Lead the Prayer Team?</Label>
              <Controller name="lead_prayer_team" control={control} render={({ field }) => (
                <YesNoGroup name="lead_prayer_team" value={field.value} onChange={field.onChange}
                  error={errors.lead_prayer_team?.message} />
              )} />
            </div>
          </div>
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-8 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Register for Awakening"}
        </button>
      </div>
    </form>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function AwakeningRegistration() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <PageHeader />

      <main className="flex-1 px-5 py-10 sm:px-8">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-mono uppercase tracking-widest text-ink-500 mb-1">
              September 9 – 13
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-ink leading-snug">
              Awakening Conference Registration
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              Secure your spot — fill in your details below to register.
            </p>
          </div>

          <RegistrationForm />
        </div>
      </main>

      <footer className="border-t border-ink-200 py-5 px-5 sm:px-8 text-center text-xs text-ink-500">
        Harvesters International Christian Centre
      </footer>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="border-b border-ink-200 bg-cream">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-3">
        <img
          src="/logo.jpg"
          alt="Harvesters"
          className="h-12 w-auto select-none mix-blend-multiply"
        />
        <span className="hidden sm:inline-block h-4 w-px bg-ink-200" />
        <span className="hidden sm:inline-block text-sm text-ink-500 font-mono">
          Awakening Conference
        </span>
      </div>
    </header>
  );
}
