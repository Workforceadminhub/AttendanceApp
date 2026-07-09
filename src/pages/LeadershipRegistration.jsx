import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "react-toastify";
import { leadershipRegistrationSchema } from "../utils/schemas";
import { lookupWorkerByPhone, submitRegistration } from "../services/leadershipRegistrations";
import { PUBLIC_LOOKUP_HINT, PUBLIC_SUBMIT_ERROR } from "../utils/safeMessages";
import { CheckCircleIcon, MagnifyingGlassIcon, UserCircleIcon } from "@heroicons/react/24/outline";

const CAMPUSES = [
  "Gbagada", "Magodo", "Ikorodu", "Jericho", "Yaba",
  "Ilupeju", "Akobo", "Port Harcourt", "Oluyole", "Surulere", "Ogba", "Toronto",
];

const LEADERSHIP_ROLES = [
  "Assistant Small Group Leader",
  "Small Group Leader",
  "E-Group Leader",
  "Assistant Cell Leader",
  "Cell Leader",
  "Interest Group Leader",
  "Assistant HOD",
  "Zonal Leader",
  "Admin",
  "District Leader",
  "HOD",
  "Assistant Sub Team Head",
  "Sub Team Head",
  "Assistant Community Leader",
  "Community Leader",
  "Pastoral Leader",
  "Directional Leader",
];

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

// Read-only field shown for pre-filled worker details
function ReadonlyField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-500 mb-1">{label}</p>
      <p className="rounded-lg border border-ink-200 bg-ink-100 px-3 py-2.5 text-sm text-ink">
        {value || <span className="text-ink-500 italic">Not on record</span>}
      </p>
    </div>
  );
}

// ── Step 1: Phone lookup ──────────────────────────────────────────────────────

function PhoneLookupStep({ onFound, onManual }) {
  const [phone, setPhone] = useState("");
  const [isLooking, setIsLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleLookup = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Enter a valid phone number (at least 10 digits).");
      return;
    }
    setIsLooking(true);
    setNotFound(false);
    try {
      const worker = await lookupWorkerByPhone(cleaned);
      onFound(worker);
    } catch {
      setNotFound(true);
    } finally {
      setIsLooking(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLookup();
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="lookup-phone" required>Your Registered Phone Number</Label>
        <p className="text-xs text-ink-500 mb-2">
          We'll use this to find your details in our records.
        </p>
        <div className="flex gap-2">
          <input
            id="lookup-phone"
            type="tel"
            placeholder="08012345678"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setNotFound(false); }}
            onKeyDown={handleKey}
            className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition"
            disabled={isLooking}
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={isLooking || !phone.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            {isLooking ? "Searching..." : "Find Me"}
          </button>
        </div>
      </div>

      {notFound && (
        <div className="rounded-lg border border-ink-200 bg-ink-100 p-4 space-y-2">
          <p className="text-sm text-ink font-medium">{PUBLIC_LOOKUP_HINT}</p>
          <button
            type="button"
            onClick={() => onManual(phone)}
            className="text-xs font-medium text-ink underline underline-offset-2 hover:text-ink/70 transition"
          >
            Fill in my details
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Registration form (pre-filled or manual) ─────────────────────────

function RegistrationForm({ prefilled, rawPhone, onReset }) {
  const isManual = !prefilled;

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(leadershipRegistrationSchema),
    defaultValues: {
      fullName: prefilled?.fullName ?? "",
      email: prefilled?.email ?? "",
      phoneNumber: prefilled?.phoneNumber ?? rawPhone ?? "",
      sex: "",
      leadershipStatus: "",
      leadershipRole: prefilled?.leadershipRole ?? "",
      campus: prefilled?.campus ?? "",
      course: "",
    },
  });

  const leadershipStatus = watch("leadershipStatus");
  const isExisting = leadershipStatus === "Existing Leader";

  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (!isExisting) delete payload.leadershipRole;
      await submitRegistration(payload);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error(PUBLIC_SUBMIT_ERROR);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircleIcon className="mx-auto h-14 w-14 text-forest" />
        <h2 className="text-2xl font-semibold text-ink">Registration Received</h2>
        <p className="text-sm text-ink-500 leading-relaxed max-w-sm mx-auto">
          Thank you for registering for the Leadership Training Course. We will be in touch
          with further details.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition";
  const selectClass = `${inputClass} appearance-none`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Back link — always visible */}
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
      >
        ← Back
      </button>

      {/* Confirmed identity banner (pre-filled) */}
      {!isManual && (
        <div className="rounded-lg border border-ink-200 bg-ink-100 px-4 py-3 flex items-start gap-3">
          <UserCircleIcon className="h-5 w-5 text-ink-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">{prefilled.fullName}</p>
            <p className="text-xs text-ink-500 truncate">{prefilled.email || prefilled.phoneNumber}</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-ink-500 underline underline-offset-2 hover:text-ink transition shrink-0"
          >
            Not you?
          </button>
        </div>
      )}

      {/* Pre-filled read-only fields OR manual inputs */}
      {!isManual ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadonlyField label="Full Name" value={prefilled.fullName} />
          <ReadonlyField label="Phone Number" value={prefilled.phoneNumber} />
          <div className="sm:col-span-2">
            <ReadonlyField label="Email Address" value={prefilled.email} />
          </div>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="fullName" required>Full Name</Label>
            <input id="fullName" type="text" placeholder="e.g. Adebayo Okafor"
              className={inputClass} {...register("fullName")} />
            <FieldError message={errors.fullName?.message} />
          </div>
          <div>
            <Label htmlFor="email" required>Email Address</Label>
            <input id="email" type="email" placeholder="you@example.com"
              className={inputClass} {...register("email")} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="phoneNumber" required>Phone Number</Label>
            <input id="phoneNumber" type="tel" placeholder="08012345678"
              className={inputClass} {...register("phoneNumber")} />
            <FieldError message={errors.phoneNumber?.message} />
          </div>
        </>
      )}

      {/* Sex + Leadership Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="sex" required>Sex</Label>
          <Controller name="sex" control={control} render={({ field }) => (
            <select id="sex" className={selectClass} {...field}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          )} />
          <FieldError message={errors.sex?.message} />
        </div>

        <div>
          <Label htmlFor="leadershipStatus" required>Leadership Status</Label>
          <Controller name="leadershipStatus" control={control} render={({ field }) => (
            <select id="leadershipStatus" className={selectClass} {...field}>
              <option value="">Select</option>
              <option>New Leader</option>
              <option>Existing Leader</option>
            </select>
          )} />
          <FieldError message={errors.leadershipStatus?.message} />
        </div>
      </div>

      {/* Leadership Role — existing leaders only */}
      {isExisting && (
        <div>
          <Label htmlFor="leadershipRole" required>Current Leadership Role</Label>
          <Controller name="leadershipRole" control={control} render={({ field }) => (
            <select id="leadershipRole" className={selectClass} {...field}>
              <option value="">Select role</option>
              {LEADERSHIP_ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          )} />
          <FieldError message={errors.leadershipRole?.message} />
        </div>
      )}

      {/* Campus + Course */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="campus" required>Campus</Label>
          <Controller name="campus" control={control} render={({ field }) => (
            <select id="campus" className={selectClass} {...field}>
              <option value="">Select campus</option>
              {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          )} />
          <FieldError message={errors.campus?.message} />
        </div>

        <div>
          <Label htmlFor="course" required>Course</Label>
          <Controller name="course" control={control} render={({ field }) => (
            <select id="course" className={selectClass} {...field}>
              <option value="">Select course</option>
              <option>BLC</option>
              <option>ALC</option>
            </select>
          )} />
          <FieldError message={errors.course?.message} />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-8 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Registration"}
        </button>
      </div>
    </form>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function LeadershipRegistration() {
  // null = lookup step | { ...workerData } = pre-filled | "manual" = skip lookup
  const [workerData, setWorkerData] = useState(null);
  const [rawPhone, setRawPhone] = useState("");

  const handleFound = (worker) => setWorkerData(worker);
  const handleManual = (phone) => {
    setRawPhone(phone);
    setWorkerData("manual");
  };
  const handleReset = () => {
    setWorkerData(null);
    setRawPhone("");
  };

  const showLookup = workerData === null;
  const prefilled = workerData !== null && workerData !== "manual" ? workerData : null;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <PageHeader />

      <main className="flex-1 px-5 py-10 sm:px-8">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-mono uppercase tracking-widest text-ink-500 mb-1">
              Group 2 BLC / ALC
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-ink leading-snug">
              Leadership Training Registration
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              {showLookup
                ? "Enter your phone number to find your details, then complete your registration."
                : "Confirm your details and complete the form below."}
            </p>
          </div>

          {showLookup ? (
            <PhoneLookupStep onFound={handleFound} onManual={handleManual} />
          ) : (
            <RegistrationForm
              prefilled={prefilled}
              rawPhone={rawPhone}
              onReset={handleReset}
            />
          )}
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
          Leadership Training
        </span>
      </div>
    </header>
  );
}
