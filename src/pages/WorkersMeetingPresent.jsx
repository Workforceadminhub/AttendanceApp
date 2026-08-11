import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  getMeetingSession,
  searchMeetingWorkers,
  createMeetingWorker,
  markMeetingWorkerPresent,
} from "../services/meeting";
import {
  DEFAULT_WORKERS_MEETING_DATE,
  getMeetingDate,
  formatMeetingDisplayDate,
} from "../utils/meetingConfig";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { DROPDOWN_OPTIONS } from "../utils/sampleWorkersExcel";
import { fetchTeamsAndDepartmentsForFilter } from "../services/departments";
import Spinner from "../components/ui/Spinner";
import { teamsAndDepartments } from "../utils/teams";

const MEETING_TYPE = "workers";
const MEETING_DATE = getMeetingDate(DEFAULT_WORKERS_MEETING_DATE);
const DISPLAY_DATE = formatMeetingDisplayDate(MEETING_DATE);

const PLACEHOLDER_ROLES = new Set([
  "",
  "district",
  "worker",
  "cell leader",
  "hod",
  "assistant hod",
]);

function isPlaceholderRole(role) {
  const normalized = (role || "").trim().toLowerCase();
  return PLACEHOLDER_ROLES.has(normalized);
}

function isValidPresentPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length === 11;
}

function isValidOptionalEmail(email) {
  const e = (email || "").trim();
  if (!e) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function splitWorkerName(worker) {
  if (worker.firstname || worker.lastname) {
    return {
      firstname: worker.firstname || "",
      lastname: worker.lastname || "",
      othername: worker.othername || "",
    };
  }
  const parts = (worker.name || "").trim().split(/\s+/);
  return {
    firstname: parts[0] || "",
    lastname: parts.slice(1).join(" ") || "",
    othername: "",
  };
}

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
      const results = await searchMeetingWorkers(trimmed, token, MEETING_DATE, MEETING_TYPE);
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
          Enter your name to mark your attendance for the Workers Meeting.
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

function SelectWorkerStep({
  workers,
  searchedName,
  onSelect,
  onBack,
  onRetrySearch,
  onAddNew,
  token,
}) {
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
      const results = await searchMeetingWorkers(trimmed, token, MEETING_DATE, MEETING_TYPE);
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
              const alreadyPresent = w.isPresent === true || w.is_present === true;
              const alreadyDeclined = w.isConfirmed === false || w.is_confirmed === false;
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
                    {alreadyPresent ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Present
                      </span>
                    ) : alreadyDeclined ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sienna-50 px-2.5 py-0.5 text-xs font-medium text-sienna">
                        <XCircleIcon className="h-3.5 w-3.5" />
                        Not Attending
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onAddNew(searchedName)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-cream"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Add yourself as a new worker
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EditPresentStep({ worker, token, onBack, onDone }) {
  const alreadyPresent = worker.isPresent === true || worker.is_present === true;
  const alreadyDeclined = worker.isConfirmed === false || worker.is_confirmed === false;
  const nameParts = splitWorkerName(worker);
  const missing = new Set(worker.isMissing || []);
  const showEmail = missing.has("email");
  const initialRole = isPlaceholderRole(worker.role) ? "" : worker.role || "";

  const [form, setForm] = useState({
    firstname: nameParts.firstname,
    lastname: nameParts.lastname,
    othername: nameParts.othername,
    email: worker.email || "",
    role: initialRole,
    department: worker.department || "",
    team: worker.team || "",
    phone: worker.phone || worker.phonenumber || worker.phone_number || "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setTeam = (e) => {
    setForm((prev) => ({ ...prev, team: e.target.value, department: "" }));
    setErrors((prev) => ({ ...prev, team: undefined, department: undefined }));
  };

  const selectedTeamData = teamsAndDepartments.find((t) => t.team === form.team);
  const departmentOptions = selectedTeamData?.department || [];

  const canMarkPresent =
    Boolean(form.firstname.trim()) &&
    Boolean(form.lastname.trim()) &&
    isValidPresentPhone(form.phone) &&
    Boolean(form.role.trim()) &&
    !isPlaceholderRole(form.role) &&
    Boolean(form.team) &&
    Boolean(form.department) &&
    (!showEmail || isValidOptionalEmail(form.email));

  const validate = () => {
    const errs = {};
    if (!form.firstname.trim()) errs.firstname = "First name is required";
    if (!form.lastname.trim()) errs.lastname = "Last name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!isValidPresentPhone(form.phone)) {
      errs.phone =
        "Enter a valid phone: 11 digits starting with 0, or 234/+234, or local without leading 0";
    }
    if (!form.role.trim() || isPlaceholderRole(form.role))
      errs.role = "Please select a role";
    if (!form.team) errs.team = "Team is required";
    if (!form.department) errs.department = "Department is required";
    if (showEmail && form.email.trim() && !isValidOptionalEmail(form.email)) {
      errs.email = "Invalid email address";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (!canMarkPresent) return;
    setIsSubmitting(true);
    try {
      const payload = {
        meeting_date: MEETING_DATE,
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        othername: form.othername.trim() || undefined,
        role: form.role.trim(),
        department: form.department,
        team: form.team,
        phone: form.phone.trim(),
      };
      if (showEmail && form.email.trim()) payload.email = form.email.trim();
      await markMeetingWorkerPresent(worker.id, payload, token, MEETING_TYPE);
      onDone();
    } catch (err) {
      toast.error(err.message || "Failed to mark present. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyPresent) {
    const phone =
      worker.phone || worker.phonenumber || worker.phone_number || "";
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
            <p className="text-sm font-semibold text-ink">Already marked present</p>
            <p className="mt-1 text-xs text-ink-500 leading-relaxed">
              {worker.name ? `${worker.name}, you` : "You"} have already been marked present
              for this meeting. No further action is needed.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-ink mb-3">Your details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadonlyField label="First Name" value={nameParts.firstname} />
            <ReadonlyField label="Last Name" value={nameParts.lastname} />
            <ReadonlyField label="Other Name" value={nameParts.othername} />
            <ReadonlyField label="Phone Number" value={phone} />
            {worker.email ? <ReadonlyField label="Email Address" value={worker.email} /> : null}
            <ReadonlyField label="Role" value={worker.role} />
            <ReadonlyField label="Team" value={worker.team} />
            <ReadonlyField label="Department" value={worker.department} />
          </div>
        </div>
      </div>
    );
  }

  if (alreadyDeclined && !alreadyPresent) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
        >
          &larr; Back
        </button>
        <div className="rounded-lg border border-sienna-200 bg-sienna-50 px-5 py-6 flex items-start gap-4">
          <XCircleIcon className="h-6 w-6 text-sienna shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-ink">Not attending</p>
            <p className="mt-1 text-xs text-ink-500 leading-relaxed">
              {worker.name ? `${worker.name}, you` : "You"} indicated that you will not be attending this meeting. No further action is needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink transition"
      >
        &larr; Back
      </button>

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

      <div className="rounded-lg border border-ink-200 bg-white p-4 space-y-4">
        <p className="text-xs text-ink-500">
          Please confirm and complete your details to mark yourself present.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="present-firstname" required>First Name</Label>
            <input
              id="present-firstname"
              type="text"
              placeholder="First name"
              value={form.firstname}
              onChange={set("firstname")}
              className={inputClass}
            />
            <FieldError message={errors.firstname} />
          </div>

          <div>
            <Label htmlFor="present-lastname" required>Last Name</Label>
            <input
              id="present-lastname"
              type="text"
              placeholder="Last name"
              value={form.lastname}
              onChange={set("lastname")}
              className={inputClass}
            />
            <FieldError message={errors.lastname} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="present-othername">Other Name (Optional)</Label>
            <input
              id="present-othername"
              type="text"
              placeholder="Middle or other name"
              value={form.othername}
              onChange={set("othername")}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="present-phone" required>Phone Number</Label>
            <input
              id="present-phone"
              type="tel"
              placeholder="e.g. 08012345678"
              value={form.phone}
              onChange={set("phone")}
              className={inputClass}
            />
            <FieldError message={errors.phone} />
          </div>

          {showEmail && (
            <div className="sm:col-span-2">
              <Label htmlFor="present-email">Email Address</Label>
              <input
                id="present-email"
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={set("email")}
                className={inputClass}
              />
              <FieldError message={errors.email} />
            </div>
          )}

          <div>
            <Label htmlFor="present-role" required>Role</Label>
            <select
              id="present-role"
              value={form.role}
              onChange={set("role")}
              className={selectClass}
            >
              <option value="">Select Role</option>
              {DROPDOWN_OPTIONS.roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <FieldError message={errors.role} />
          </div>

          <div>
            <Label htmlFor="present-team" required>Team</Label>
            <select
              id="present-team"
              value={form.team}
              onChange={setTeam}
              className={selectClass}
            >
              <option value="">Select Team</option>
              {teamsAndDepartments.map((t) => (
                <option key={t.team} value={t.team}>{t.team}</option>
              ))}
            </select>
            <FieldError message={errors.team} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="present-department" required>Department</Label>
            <select
              id="present-department"
              value={form.department}
              onChange={set("department")}
              className={selectClass}
              disabled={!form.team}
            >
              <option value="">
                {form.team ? "Select Department" : "Select a team first"}
              </option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <FieldError message={errors.department} />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !canMarkPresent}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-8 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Mark Me Present"}
        </button>
      </div>
    </form>
  );
}

function CreateWorkerStep({ searchedName, token, onBack, onDone }) {
  const initialNames = splitWorkerName({ name: searchedName });
  const [form, setForm] = useState({
    firstname: initialNames.firstname,
    lastname: initialNames.lastname,
    othername: "",
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
    const val = e.target.value;
    setForm((prev) => ({ ...prev, team: val, department: "", district_sub_team: "" }));
    setErrors((prev) => ({ ...prev, team: undefined, department: undefined, district_sub_team: undefined }));
  };

  const selectedTeamData = teamsAndDepartments.find((t) => t.team === form.team);
  const departmentOptions = selectedTeamData?.department || [];

  const validate = () => {
    const errs = {};
    if (!form.firstname.trim()) errs.firstname = "First name is required";
    if (!form.lastname.trim()) errs.lastname = "Last name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!isValidPresentPhone(form.phone)) {
      errs.phone = "Enter a valid phone number";
    }
    if (!form.role.trim() || isPlaceholderRole(form.role)) errs.role = "Role is required";
    if (!form.team) errs.team = "Team is required";
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
        email: form.email.trim() || undefined,
        phone: form.phone.replace(/\D/g, ""),
        gender: form.gender || undefined,
        role: form.role,
        birthdate: form.birthdate || undefined,
        maritalstatus: form.maritalstatus || undefined,
        agerange: form.agerange || undefined,
        address: form.address.trim() || undefined,
        employment: form.employment || undefined,
        occupation: form.occupation.trim() || undefined,
        team: form.team,
        district_sub_team: form.team === "Districts" ? form.district_sub_team : undefined,
        department: form.department,
        is_present: true,
        meeting_date: MEETING_DATE,
      };
      await createMeetingWorker(payload, token, MEETING_TYPE);
      onDone();
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
          Please fill in your details to register and mark yourself present.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="create-firstname" required>First Name</Label>
          <input id="create-firstname" type="text" placeholder="First name" value={form.firstname} onChange={set("firstname")} className={inputClass} />
          <FieldError message={errors.firstname} />
        </div>

        <div>
          <Label htmlFor="create-lastname" required>Last Name</Label>
          <input id="create-lastname" type="text" placeholder="Last name" value={form.lastname} onChange={set("lastname")} className={inputClass} />
          <FieldError message={errors.lastname} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="create-othername">Other Name (Optional)</Label>
          <input id="create-othername" type="text" placeholder="Middle or other name" value={form.othername} onChange={set("othername")} className={inputClass} />
        </div>

        <div>
          <Label htmlFor="create-phone" required>Phone Number</Label>
          <input id="create-phone" type="tel" placeholder="e.g. 08012345678" value={form.phone} onChange={set("phone")} className={inputClass} />
          <FieldError message={errors.phone} />
        </div>

        <div>
          <Label htmlFor="create-email">Email Address</Label>
          <input id="create-email" type="email" placeholder="user@example.com" value={form.email} onChange={set("email")} className={inputClass} />
        </div>

        <div>
          <Label htmlFor="create-role" required>Role</Label>
          <select id="create-role" value={form.role} onChange={set("role")} className={selectClass}>
            <option value="">Select Role</option>
            {DROPDOWN_OPTIONS.roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <FieldError message={errors.role} />
        </div>

        <div>
          <Label htmlFor="create-team" required>Team</Label>
          <select id="create-team" value={form.team} onChange={setTeam} className={selectClass}>
            <option value="">Select Team</option>
            {teamsAndDepartments.map((t) => (
              <option key={t.team} value={t.team}>{t.team}</option>
            ))}
          </select>
          <FieldError message={errors.team} />
        </div>

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
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-8 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Add Worker & Mark Present"}
        </button>
      </div>
    </form>
  );
}

function SuccessScreen() {
  return (
    <div className="text-center py-8 space-y-3">
      <CheckCircleIcon className="mx-auto h-14 w-14 text-forest" />
      <h2 className="text-2xl font-semibold text-ink">You are marked present!</h2>
      <p className="text-sm text-ink-500 leading-relaxed max-w-sm mx-auto">
        Thank you for attending the Workers Meeting. Your attendance has been recorded successfully.
      </p>
    </div>
  );
}

export default function WorkersMeetingPresent() {
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionError, setSessionError] = useState(false);
  const initCalled = useRef(false);

  const [step, setStep] = useState("search");
  const [results, setResults] = useState([]);
  const [searchedName, setSearchedName] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    getMeetingSession(MEETING_TYPE)
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

  const handleDone = () => {
    if (selectedWorker) {
      const updated = { ...selectedWorker, is_present: true, isPresent: true };
      setSelectedWorker(updated);
      setResults((prev) =>
        prev.map((w) => (w.id === selectedWorker.id ? { ...w, is_present: true, isPresent: true } : w))
      );
    }
    setStep("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetrySession = () => {
    setSessionError(false);
    getMeetingSession(MEETING_TYPE)
      .then((apiKey) => setSessionToken(apiKey))
      .catch(() => setSessionError(true));
  };

  if (sessionError) {
    return (
      <Shell>
        <div className="rounded-lg border border-sienna-50 bg-sienna-50 p-6 text-center space-y-3">
          <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-sienna" />
          <p className="text-sm font-medium text-ink">Unable to start session</p>
          <p className="text-xs text-ink-500 max-w-xs mx-auto">
            Could not connect to the meeting service. Please check your internet connection and try again.
          </p>
          <button
            type="button"
            onClick={handleRetrySession}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-cream hover:bg-ink/90 transition"
          >
            Retry Connection
          </button>
        </div>
      </Shell>
    );
  }

  if (!sessionToken) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Spinner size="lg" className="text-ink-900" />
          <p className="text-sm text-ink-500 font-medium">Starting session...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-500 mb-1">
          Workers Meeting Attendance - {DISPLAY_DATE}
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink leading-snug">
          Mark Your Attendance
        </h1>
        {step !== "search" && step !== "done" && (
          <p className="mt-2 text-sm text-ink-500">
            {step === "select" && "Select your name from the results below."}
            {step === "edit" && "Review and complete your details."}
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
        <EditPresentStep
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
      {step === "done" && <SuccessScreen />}
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
            Workers Meeting Attendance - {DISPLAY_DATE}
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
