import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  getMeetingSession,
  searchMeetingWorkers,
  updateMeetingWorker,
  createMeetingWorker,
} from "../services/meeting";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import BirthDatePicker from "../components/BirthDatePicker";
import { DROPDOWN_OPTIONS } from "../utils/sampleWorkersExcel";
import { teamsAndDepartments } from "../utils/teams";

// ── Shared UI helpers ────────────────────────────────────────────────────────

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

const inputClass =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition";

const selectClass = `${inputClass} appearance-none`;

// ── Step 1: Name Search ──────────────────────────────────────────────────────

function NameSearchStep({ onResults, token }) {
  const [name, setName] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a name to search.");
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchMeetingWorkers(trimmed, token, MEETING_DATE);
      const list = Array.isArray(results) ? results : [];
      onResults(list, trimmed);
    } catch (err) {
      toast.error(err.message || "Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="search-name" required>
          Your Full Name
        </Label>
        <p className="text-xs text-ink-500 mb-2">
          Enter your first name and surname so we can find your record.
        </p>
        <div className="flex gap-2">
          <input
            id="search-name"
            type="text"
            placeholder="e.g. Mayowa Agboade"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKey}
            className={`flex-1 ${inputClass}`}
            disabled={isSearching}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            {isSearching ? "Searching..." : "Find Me"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Select Yourself ──────────────────────────────────────────────────

function SelectWorkerStep({ workers, searchedName, onSelect, onBack, onRetrySearch, onAddNew, token }) {
  const [retryName, setRetryName] = useState(searchedName);
  const [isSearching, setIsSearching] = useState(false);

  const handleRetry = async () => {
    const trimmed = retryName.trim();
    if (!trimmed) {
      toast.error("Please enter a name to search.");
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchMeetingWorkers(trimmed, token, MEETING_DATE);
      const list = Array.isArray(results) ? results : [];
      onRetrySearch(list, trimmed);
    } catch (err) {
      toast.error(err.message || "Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleRetry();
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
      >
        &larr; Back
      </button>

      {workers.length === 0 ? (
        <div className="rounded-lg border border-ink-200 bg-ink-100 p-6 space-y-4">
          <div className="text-center space-y-2">
            <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-ink-400" />
            <p className="text-sm font-medium text-ink">
              No results for &ldquo;{searchedName}&rdquo;
            </p>
            <p className="text-xs text-ink-500">
              Check the spelling and try again, or add yourself as a new worker.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={retryName}
              onChange={(e) => setRetryName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. Mayowa Agboade"
              className={`flex-1 ${inputClass}`}
              disabled={isSearching}
              autoFocus
            />
            <button
              type="button"
              onClick={handleRetry}
              disabled={isSearching || !retryName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              {isSearching ? "Searching..." : "Try Again"}
            </button>
          </div>
          <div className="border-t border-ink-200 pt-4">
            <button
              type="button"
              onClick={() => onAddNew(searchedName)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-cream"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Add yourself as a new worker
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium text-ink mb-1">
              {workers.length} result{workers.length !== 1 ? "s" : ""} found
            </p>
            <p className="text-xs text-ink-500 mb-3">
              Select your name from the list below.
            </p>
          </div>

          <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200 overflow-hidden">
            {workers.map((w) => {
              const displayName = w.name || "-";
              const sub = [w.department, w.team].filter(Boolean).join(" · ");
              const alreadyConfirmed = w.isConfirmed === true || w.is_confirmed === true;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(w)}
                    className="w-full text-left px-4 py-3 hover:bg-ink-100 transition flex items-center gap-3"
                  >
                    <UserCircleIcon className="h-8 w-8 text-ink-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {displayName}
                      </p>
                      {sub && (
                        <p className="text-xs text-ink-500 truncate">{sub}</p>
                      )}
                    </div>
                    {alreadyConfirmed && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Confirmed
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Step 3: Edit & Submit ────────────────────────────────────────────────────

function ReadonlyField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-500 mb-1">{label}</p>
      <p className="rounded-lg border border-ink-200 bg-ink-100 px-3 py-2.5 text-sm text-ink">
        {value || <span className="text-ink-400 italic">-</span>}
      </p>
    </div>
  );
}

const MEETING_DATE = "2026-07-18";

const AGE_RANGES = ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"];
const EMPLOYMENT_OPTIONS = ["Employed", "Self-employed", "Unemployed", "Student", "Retired"];
const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];

function EditWorkerStep({ worker, token, onBack, onDone }) {
  const alreadyConfirmed = worker.isConfirmed === true || worker.is_confirmed === true;
  const missing = new Set(worker.isMissing || []);
  const hasMissing = missing.size > 0;

  const [attending, setAttending] = useState(""); // "" | "yes" | "no"
  const [declineReason, setDeclineReason] = useState("");
  const [form, setForm] = useState({
    email: worker.email || "",
    phone: worker.phone || "",
    role: worker.role || "",
    birthdate: worker.birthdate || "",
    gender: worker.gender || "",
    maritalstatus: worker.maritalstatus || "",
    agerange: worker.agerange || "",
    address: worker.address || "",
    employment: worker.employment || "",
    occupation: worker.occupation || "",
    district_sub_team: worker.district_sub_team || "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!attending) errs.attending = "Please select whether you will be attending";
    if (attending === "no" && !declineReason.trim())
      errs.declineReason = "Please provide a reason";
    if (hasMissing) {
      if (missing.has("email")) {
        if (!form.email.trim()) errs.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
          errs.email = "Invalid email address";
      }
      if (missing.has("phone") && !form.phone.trim()) errs.phone = "Phone is required";
      if (missing.has("gender") && !form.gender) errs.gender = "Gender is required";
      if (missing.has("maritalstatus") && !form.maritalstatus) errs.maritalstatus = "Marital status is required";
      if (missing.has("agerange") && !form.agerange) errs.agerange = "Age range is required";
      if (missing.has("address") && !form.address.trim()) errs.address = "Address is required";
      if (missing.has("employment") && !form.employment) errs.employment = "Employment status is required";
      if (missing.has("occupation") && !form.occupation.trim()) errs.occupation = "Occupation is required";
      if (missing.has("district_sub_team") && !form.district_sub_team.trim()) errs.district_sub_team = "District/Sub-team is required";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setIsSubmitting(true);
    try {
      const isConfirmed = attending === "yes";
      const payload = { meeting_date: MEETING_DATE, is_confirmed: isConfirmed };
      if (!isConfirmed) payload.notes = declineReason.trim();
      if (hasMissing) {
        if (missing.has("email")) payload.email = form.email.trim();
        if (missing.has("phone")) payload.phone = form.phone.trim();
        if (missing.has("gender")) payload.gender = form.gender;
        if (missing.has("role") && form.role.trim()) payload.role = form.role.trim();
        if (missing.has("birthdate") && form.birthdate) payload.birthdate = form.birthdate;
        if (missing.has("maritalstatus") && form.maritalstatus) payload.maritalstatus = form.maritalstatus;
        if (missing.has("agerange") && form.agerange) payload.agerange = form.agerange;
        if (missing.has("address") && form.address.trim()) payload.address = form.address.trim();
        if (missing.has("employment") && form.employment) payload.employment = form.employment;
        if (missing.has("occupation") && form.occupation.trim()) payload.occupation = form.occupation.trim();
        if (missing.has("district_sub_team") && form.district_sub_team.trim()) payload.district_sub_team = form.district_sub_team.trim();
      }
      await updateMeetingWorker(worker.id, payload, token);
      onDone(isConfirmed ? "confirm" : "decline");
    } catch (err) {
      toast.error(err.message || "Update failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyConfirmed) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
        >
          &larr; Back
        </button>
        <div className="rounded-lg border border-forest-200 bg-forest-50 px-5 py-6 flex items-start gap-4">
          <CheckCircleIcon className="h-6 w-6 text-forest shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-ink">Already confirmed</p>
            <p className="mt-1 text-xs text-ink-500 leading-relaxed">
              {worker.name ? `${worker.name}, you` : "You"} have already confirmed your attendance for this meeting. No further action is needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const missingBadge = (
    <span className="ml-1.5 inline-block rounded bg-mustard-50 px-1.5 py-0.5 text-2xs font-medium text-mustard">
      Missing
    </span>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
      >
        &larr; Back
      </button>

      {/* Identity banner */}
      <div className="rounded-lg border border-ink-200 bg-ink-100 px-4 py-3 flex items-center gap-3">
        <UserCircleIcon className="h-5 w-5 text-ink-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{worker.name}</p>
          {(worker.department || worker.team) && (
            <p className="text-xs text-ink-500 truncate">
              {[worker.department, worker.team].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {!hasMissing ? (
        <>
          <div className="rounded-lg border border-forest-50 bg-forest-50 px-4 py-3">
            <p className="text-sm text-forest font-medium">
              Your details are complete. Nothing to update.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {worker.role && <ReadonlyField label="Role" value={worker.role} />}
            {worker.department && <ReadonlyField label="Department" value={worker.department} />}
            {worker.team && <ReadonlyField label="Team" value={worker.team} />}
          </div>
        </>
      ) : (
        <>
          {/* Existing details (read-only) shown first */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!missing.has("email") && worker.email && <ReadonlyField label="Email Address" value={worker.email} />}
            {!missing.has("phone") && worker.phone && <ReadonlyField label="Phone Number" value={worker.phone} />}
            {!missing.has("gender") && worker.gender && <ReadonlyField label="Gender" value={worker.gender} />}
            {!missing.has("maritalstatus") && worker.maritalstatus && <ReadonlyField label="Marital Status" value={worker.maritalstatus} />}
            {!missing.has("agerange") && worker.agerange && <ReadonlyField label="Age Range" value={worker.agerange} />}
            {!missing.has("role") && worker.role && <ReadonlyField label="Role" value={worker.role} />}
            {!missing.has("birthdate") && worker.birthdate && <ReadonlyField label="Date of Birth" value={worker.birthdate} />}
            {!missing.has("address") && worker.address && <ReadonlyField label="Address" value={worker.address} />}
            {!missing.has("employment") && worker.employment && <ReadonlyField label="Employment Status" value={worker.employment} />}
            {!missing.has("occupation") && worker.occupation && <ReadonlyField label="Occupation" value={worker.occupation} />}
            {!missing.has("district_sub_team") && worker.district_sub_team && <ReadonlyField label="District/Sub-team" value={worker.district_sub_team} />}
          </div>

          {/* Missing fields (editable) */}
          <p className="text-xs text-ink-500">
            Please complete the fields marked{" "}
            <span className="rounded bg-mustard-50 px-1 py-0.5 text-2xs font-medium text-mustard">
              Missing
            </span>{" "}
            below.
          </p>

          {missing.has("email") && (
            <div>
              <Label htmlFor="edit-email" required>
                Email Address {missingBadge}
              </Label>
              <input id="edit-email" type="email" placeholder="you@example.com"
                value={form.email} onChange={set("email")} className={inputClass} />
              <FieldError message={errors.email} />
            </div>
          )}

          {missing.has("phone") && (
            <div>
              <Label htmlFor="edit-phone" required>
                Phone Number {missingBadge}
              </Label>
              <input id="edit-phone" type="tel" placeholder="08012345678"
                value={form.phone} onChange={set("phone")} className={inputClass} />
              <FieldError message={errors.phone} />
            </div>
          )}

          {missing.has("gender") && (
            <div>
              <Label htmlFor="edit-gender" required>
                Gender {missingBadge}
              </Label>
              <select id="edit-gender" value={form.gender} onChange={set("gender")} className={selectClass}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              <FieldError message={errors.gender} />
            </div>
          )}

          {missing.has("maritalstatus") && (
            <div>
              <Label htmlFor="edit-maritalstatus" required>
                Marital Status {missingBadge}
              </Label>
              <select id="edit-maritalstatus" value={form.maritalstatus} onChange={set("maritalstatus")} className={selectClass}>
                <option value="">Select</option>
                {MARITAL_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <FieldError message={errors.maritalstatus} />
            </div>
          )}

          {missing.has("agerange") && (
            <div>
              <Label htmlFor="edit-agerange" required>
                Age Range {missingBadge}
              </Label>
              <select id="edit-agerange" value={form.agerange} onChange={set("agerange")} className={selectClass}>
                <option value="">Select</option>
                {AGE_RANGES.map((o) => <option key={o}>{o}</option>)}
              </select>
              <FieldError message={errors.agerange} />
            </div>
          )}

          {missing.has("role") && (
            <div>
              <Label htmlFor="edit-role">
                Role {missingBadge}
              </Label>
              <input id="edit-role" type="text" placeholder="e.g. Member"
                value={form.role} onChange={set("role")} className={inputClass} />
            </div>
          )}

          {missing.has("birthdate") && (
            <div>
              <Label htmlFor="edit-birthdate">
                Date of Birth {missingBadge}
              </Label>
              <input id="edit-birthdate" type="date"
                value={form.birthdate} onChange={set("birthdate")} className={inputClass} />
            </div>
          )}

          {missing.has("address") && (
            <div>
              <Label htmlFor="edit-address" required>
                Address {missingBadge}
              </Label>
              <input id="edit-address" type="text" placeholder="e.g. 12 Example Street, Gbagada, Lagos"
                value={form.address} onChange={set("address")} className={inputClass} />
              <FieldError message={errors.address} />
            </div>
          )}

          {missing.has("employment") && (
            <div>
              <Label htmlFor="edit-employment" required>
                Employment Status {missingBadge}
              </Label>
              <select id="edit-employment" value={form.employment} onChange={set("employment")} className={selectClass}>
                <option value="">Select</option>
                {EMPLOYMENT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <FieldError message={errors.employment} />
            </div>
          )}

          {missing.has("occupation") && (
            <div>
              <Label htmlFor="edit-occupation" required>
                Occupation {missingBadge}
              </Label>
              <input id="edit-occupation" type="text" placeholder="e.g. Engineer"
                value={form.occupation} onChange={set("occupation")} className={inputClass} />
              <FieldError message={errors.occupation} />
            </div>
          )}

          {missing.has("district_sub_team") && (
            <div>
              <Label htmlFor="edit-district-sub-team" required>
                District/Sub-team {missingBadge}
              </Label>
              <select id="edit-district-sub-team" value={form.district_sub_team} onChange={set("district_sub_team")} className={selectClass}>
                <option value="">Select</option>
                <option>Pastor Biola Cluster</option>
                <option>Pastor Isaac Cluster</option>
              </select>
              <FieldError message={errors.district_sub_team} />
            </div>
          )}
        </>
      )}

      {/* Attendance question */}
      <div className="space-y-3">
        <Label required>Will you be attending the meeting?</Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setAttending("yes"); setErrors((p) => ({ ...p, attending: undefined })); }}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              attending === "yes"
                ? "border-forest bg-forest-50 text-forest"
                : "border-ink-200 bg-white text-ink hover:bg-cream"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => { setAttending("no"); setErrors((p) => ({ ...p, attending: undefined })); }}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              attending === "no"
                ? "border-sienna bg-sienna-50 text-sienna"
                : "border-ink-200 bg-white text-ink hover:bg-cream"
            }`}
          >
            No
          </button>
        </div>
        <FieldError message={errors.attending} />
      </div>

      {/* Decline reason */}
      {attending === "no" && (
        <div>
          <Label htmlFor="edit-decline-reason" required>
            Reason for not attending
          </Label>
          <textarea
            id="edit-decline-reason"
            rows={3}
            placeholder="Please let us know why you won't be attending"
            value={declineReason}
            onChange={(e) => {
              setDeclineReason(e.target.value);
              setErrors((p) => ({ ...p, declineReason: undefined }));
            }}
            className={inputClass}
          />
          <FieldError message={errors.declineReason} />
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-8 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Submitting..."
            : attending === "no"
              ? "Submit"
              : hasMissing
                ? "Submit Details"
                : "Confirm Attendance"}
        </button>
      </div>
    </form>
  );
}

// ── Step 3b: Create New Worker ──────────────────────────────────────────────

function CreateWorkerStep({ searchedName, token, onBack, onDone }) {
  const nameParts = (searchedName || "").trim().split(/\s+/);
  const [form, setForm] = useState({
    firstname: nameParts[0] || "",
    lastname: nameParts.length > 1 ? nameParts[nameParts.length - 1] : "",
    othername: nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "",
    email: "",
    phone: "",
    gender: "",
    role: "",
    birthdate: "",
    maritalstatus: "",
    agerange: "",
    address: "",
    employment: "",
    occupation: "",
    team: "",
    district_sub_team: "",
    department: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setTeam = (e) => {
    setForm((prev) => ({ ...prev, team: e.target.value, district_sub_team: "", department: "" }));
    setErrors((prev) => ({ ...prev, team: undefined, district_sub_team: undefined, department: undefined }));
  };

  const selectedTeamData = teamsAndDepartments.find((t) => t.team === form.team);
  const departmentOptions = selectedTeamData?.department || [];

  const validate = () => {
    const errs = {};
    if (!form.firstname.trim()) errs.firstname = "First name is required";
    if (!form.lastname.trim()) errs.lastname = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = "Invalid email address";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else {
      const digits = form.phone.replace(/\D/g, "");
      if (digits.length < 11) errs.phone = "Phone must be at least 11 digits";
      else if (digits.length > 11) errs.phone = "Phone must be at most 11 digits";
    }
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.role) errs.role = "Worker role is required";
    if (!form.birthdate) errs.birthdate = "Date of birth is required";
    if (!form.maritalstatus) errs.maritalstatus = "Marital status is required";
    if (!form.agerange) errs.agerange = "Age range is required";
    if (!form.employment) errs.employment = "Employment status is required";
    if (!form.occupation.trim()) errs.occupation = "Occupation is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.team) errs.team = "Team is required";
    if (form.team === "Districts" && !form.district_sub_team) errs.district_sub_team = "District/Sub-team is required";
    if (!form.department) errs.department = "Department is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setIsSubmitting(true);
    try {
      const payload = {
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        othername: form.othername.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.replace(/\D/g, ""),
        gender: form.gender,
        role: form.role,
        birthdate: form.birthdate,
        maritalstatus: form.maritalstatus,
        agerange: form.agerange,
        address: form.address.trim(),
        employment: form.employment,
        occupation: form.occupation.trim(),
        team: form.team,
        district_sub_team: form.team === "Districts" ? form.district_sub_team : undefined,
        department: form.department,
      };
      await createMeetingWorker(payload, token);
      onDone("create");
    } catch (err) {
      toast.error(err.message || "Failed to add worker. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
      >
        &larr; Back
      </button>

      <div className="rounded-lg border border-ink-200 bg-ink-100 px-4 py-3">
        <p className="text-sm font-medium text-ink">Add Yourself as a New Worker</p>
        <p className="text-xs text-ink-500 mt-0.5">
          Please fill in all required fields below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <Label htmlFor="create-firstname" required>First Name</Label>
          <input id="create-firstname" type="text" placeholder="Enter first name"
            value={form.firstname} onChange={set("firstname")} className={inputClass} />
          <FieldError message={errors.firstname} />
        </div>

        {/* Last Name */}
        <div>
          <Label htmlFor="create-lastname" required>Last Name</Label>
          <input id="create-lastname" type="text" placeholder="Enter last name"
            value={form.lastname} onChange={set("lastname")} className={inputClass} />
          <FieldError message={errors.lastname} />
        </div>

        {/* Other Name */}
        <div>
          <Label htmlFor="create-othername">Other Name</Label>
          <input id="create-othername" type="text" placeholder="Optional"
            value={form.othername} onChange={set("othername")} className={inputClass} />
        </div>

        {/* Gender */}
        <div>
          <Label htmlFor="create-gender" required>Gender</Label>
          <select id="create-gender" value={form.gender} onChange={set("gender")} className={selectClass}>
            <option value="">Select Gender</option>
            {DROPDOWN_OPTIONS.Gender.map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.gender} />
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="create-phone" required>Phone Number</Label>
          <input id="create-phone" type="tel" placeholder="11 digits"
            value={form.phone}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
              setForm((prev) => ({ ...prev, phone: digits }));
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            className={inputClass} />
          <FieldError message={errors.phone} />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="create-email" required>Email Address</Label>
          <input id="create-email" type="email" placeholder="you@example.com"
            value={form.email} onChange={set("email")} className={inputClass} />
          <FieldError message={errors.email} />
        </div>

        {/* Worker Role */}
        <div>
          <Label htmlFor="create-role" required>Worker Role</Label>
          <select id="create-role" value={form.role} onChange={set("role")} className={selectClass}>
            <option value="">Select Worker Role</option>
            {DROPDOWN_OPTIONS["Worker Role"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.role} />
        </div>

        {/* Birth Date */}
        <div>
          <Label required>Date of Birth (day and month)</Label>
          <BirthDatePicker
            value={form.birthdate}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, birthdate: value }));
              setErrors((prev) => ({ ...prev, birthdate: undefined }));
            }}
            placeholder="e.g. 15th May"
          />
          <FieldError message={errors.birthdate} />
        </div>

        {/* Marital Status */}
        <div>
          <Label htmlFor="create-maritalstatus" required>Marital Status</Label>
          <select id="create-maritalstatus" value={form.maritalstatus} onChange={set("maritalstatus")} className={selectClass}>
            <option value="">Select Marital Status</option>
            {DROPDOWN_OPTIONS["Marital Status"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.maritalstatus} />
        </div>

        {/* Age Range */}
        <div>
          <Label htmlFor="create-agerange" required>Age Range</Label>
          <select id="create-agerange" value={form.agerange} onChange={set("agerange")} className={selectClass}>
            <option value="">Select Age Range</option>
            {DROPDOWN_OPTIONS["Age Range"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.agerange} />
        </div>

        {/* Employment */}
        <div>
          <Label htmlFor="create-employment" required>Employment Status</Label>
          <select id="create-employment" value={form.employment} onChange={set("employment")} className={selectClass}>
            <option value="">Select Employment Status</option>
            {DROPDOWN_OPTIONS["Employment Status"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.employment} />
        </div>

        {/* Occupation */}
        <div>
          <Label htmlFor="create-occupation" required>Occupation</Label>
          <input id="create-occupation" type="text" placeholder="Enter occupation"
            value={form.occupation} onChange={set("occupation")} className={inputClass} />
          <FieldError message={errors.occupation} />
        </div>

        {/* Team */}
        <div className="sm:col-span-2">
          <Label htmlFor="create-team" required>Team</Label>
          <select id="create-team" value={form.team} onChange={setTeam} className={selectClass}>
            <option value="">Select Team</option>
            {teamsAndDepartments.map((t) => (
              <option key={t.team} value={t.team}>{t.team}</option>
            ))}
          </select>
          <FieldError message={errors.team} />
        </div>

        {/* District/Sub-team — only for Districts */}
        {form.team === "Districts" && (
          <div className="sm:col-span-2">
            <Label htmlFor="create-district-sub-team" required>District/Sub-team</Label>
            <select id="create-district-sub-team" value={form.district_sub_team} onChange={set("district_sub_team")} className={selectClass}>
              <option value="">Select District/Sub-team</option>
              <option value="Pastor Biola Cluster">Pastor Biola Cluster</option>
              <option value="Pastor Isaac Cluster">Pastor Isaac Cluster</option>
            </select>
            <FieldError message={errors.district_sub_team} />
          </div>
        )}

        {/* Department — filtered by team */}
        {form.team && (
          <div className="sm:col-span-2">
            <Label htmlFor="create-department" required>Department</Label>
            <select id="create-department" value={form.department} onChange={set("department")} className={selectClass}>
              <option value="">Select Department</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <FieldError message={errors.department} />
          </div>
        )}

        {/* Address */}
        <div className="sm:col-span-2">
          <Label htmlFor="create-address" required>Address</Label>
          <textarea id="create-address" rows={3}
            placeholder="Enter address"
            value={form.address}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, address: e.target.value }));
              setErrors((prev) => ({ ...prev, address: undefined }));
            }}
            className={inputClass}
          />
          <FieldError message={errors.address} />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-8 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Add Worker"}
        </button>
      </div>
    </form>
  );
}

// ── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ variant }) {
  const titles = {
    confirm: "Confirmation Status is Confirmed",
    decline: "Response Recorded",
    create: "Details Submitted",
  };
  const messages = {
    confirm: "See you at the meeting.",
    decline: "Thank you for letting us know. We hope to see you at a future meeting.",
    create: "Thank you for adding your details. Your information has been submitted successfully.",
  };
  return (
    <div className="text-center py-8 space-y-3">
      <CheckCircleIcon className="mx-auto h-14 w-14 text-forest" />
      <h2 className="text-2xl font-semibold text-ink">
        {titles[variant] || titles.confirm}
      </h2>
      <p className="text-sm text-ink-500 leading-relaxed max-w-sm mx-auto">
        {messages[variant] || messages.confirm}
      </p>
    </div>
  );
}

// ── Page Shell ───────────────────────────────────────────────────────────────

export default function LeadersMeetingConfirm() {
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionError, setSessionError] = useState(false);
  const initCalled = useRef(false);

  // Search results state
  const [step, setStep] = useState("search"); // search | select | edit | create | done
  const [results, setResults] = useState([]);
  const [searchedName, setSearchedName] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    getMeetingSession()
      .then((apiKey) => setSessionToken(apiKey))
      .catch(() => setSessionError(true));
  }, []);

  const handleResults = (workers, name) => {
    setResults(workers);
    setSearchedName(name);
    setStep("select");
  };

  const handleSelect = (worker) => {
    setSelectedWorker(worker);
    setStep("edit");
  };

  const handleBackToSearch = () => {
    setResults([]);
    setSearchedName("");
    setStep("search");
  };

  const handleBackToSelect = () => {
    setSelectedWorker(null);
    setStep("select");
  };

  const handleAddNew = (name) => {
    setSearchedName(name);
    setStep("create");
  };

  const [doneVariant, setDoneVariant] = useState(null);

  const handleDone = (variant) => {
    setDoneVariant(variant || "confirm");
    if (variant === "confirm" && selectedWorker) {
      const updated = { ...selectedWorker, is_confirmed: true, isConfirmed: true };
      setSelectedWorker(updated);
      setResults((prev) =>
        prev.map((w) => (w.id === selectedWorker.id ? { ...w, is_confirmed: true, isConfirmed: true } : w))
      );
    }
    setStep("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetrySession = () => {
    setSessionError(false);
    getMeetingSession()
      .then((apiKey) => setSessionToken(apiKey))
      .catch(() => setSessionError(true));
  };

  // ── Loading / error states ──
  if (sessionError) {
    return (
      <Shell>
        <div className="rounded-lg border border-sienna-50 bg-sienna-50 p-6 text-center space-y-3">
          <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-sienna" />
          <p className="text-sm font-medium text-ink">
            Unable to start session
          </p>
          <p className="text-xs text-ink-500">
            Please check your connection and try again.
          </p>
          <button
            type="button"
            onClick={handleRetrySession}
            className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-cream transition hover:bg-ink/90"
          >
            Retry
          </button>
        </div>
      </Shell>
    );
  }

  if (!sessionToken) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-300 border-t-ink" />
          <span className="ml-3 text-sm text-ink-500">Starting session...</span>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-500 mb-1">
          Leaders Meeting - Saturday, 18th July 2026
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink leading-snug">
          Confirm Your Attendance
        </h1>
        {step !== "search" && step !== "done" && (
          <p className="mt-2 text-sm text-ink-500">
            {step === "select" && "Select your name from the results below."}
            {step === "edit" && "Review and complete your information."}
            {step === "create" && "Fill in your details to add yourself as a new worker."}
          </p>
        )}
      </div>

      {step === "search" && (
        <NameSearchStep onResults={handleResults} token={sessionToken} />
      )}
      {step === "select" && (
        <SelectWorkerStep
          workers={results}
          searchedName={searchedName}
          onSelect={handleSelect}
          onBack={handleBackToSearch}
          onRetrySearch={handleResults}
          onAddNew={handleAddNew}
          token={sessionToken}
        />
      )}
      {step === "edit" && selectedWorker && (
        <EditWorkerStep
          worker={selectedWorker}
          token={sessionToken}
          onBack={handleBackToSelect}
          onDone={handleDone}
        />
      )}
      {step === "create" && (
        <CreateWorkerStep
          searchedName={searchedName}
          token={sessionToken}
          onBack={handleBackToSelect}
          onDone={handleDone}
        />
      )}
      {step === "done" && <SuccessScreen variant={doneVariant} />}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-ink-200 bg-cream">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Harvesters"
            className="h-12 w-auto select-none mix-blend-multiply"
          />
          <span className="hidden sm:inline-block h-4 w-px bg-ink-200" />
          <span className="hidden sm:inline-block text-sm text-ink-500 font-mono">
            Leaders Meeting - Saturday, 18th July 2026
          </span>
        </div>
      </header>

      <main className="flex-1 px-5 py-10 sm:px-8">
        <div className="max-w-xl mx-auto">{children}</div>
      </main>

      <footer className="border-t border-ink-200 py-5 px-5 sm:px-8 text-center text-xs text-ink-500">
        Harvesters International Christian Centre, Gbagada Campus
      </footer>
    </div>
  );
}
