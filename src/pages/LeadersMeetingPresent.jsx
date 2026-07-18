import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  getMeetingSession,
  searchMeetingWorkers,
  createMeetingWorker,
  markMeetingWorkerPresent,
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

const MEETING_DATE = "2026-07-18";

const inputClass =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition";
const selectClass = `${inputClass} appearance-none`;

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

function splitWorkerName(worker) {
  if (worker?.firstname || worker?.lastname) {
    return {
      firstname: worker.firstname || "",
      lastname: worker.lastname || "",
      othername: worker.othername || "",
    };
  }
  const parts = String(worker?.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstname: parts[0] || "",
    lastname: parts.length > 1 ? parts[parts.length - 1] : "",
    othername: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
  };
}

function isPlaceholderRole(role) {
  return String(role || "").trim().toLowerCase() === "worker";
}

/** Present-form phone rules: 0XXXXXXXXXX (11), 234… / +234…, or local without leading 0. */
function isValidPresentPhone(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("+234")) {
    const rest = trimmed.slice(4).replace(/\D/g, "");
    return rest.length >= 10;
  }
  if (trimmed.startsWith("234")) {
    const rest = trimmed.slice(3).replace(/\D/g, "");
    return rest.length >= 10;
  }
  if (trimmed.startsWith("0")) {
    const digits = trimmed.replace(/\D/g, "");
    return digits.length === 11;
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 && !digits.startsWith("0");
}

function isValidOptionalEmail(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

const PRESENT_ROLE_OPTIONS = DROPDOWN_OPTIONS["Worker Role"].filter(
  (role) => !isPlaceholderRole(role)
);

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
        <div className="flex gap-2 mt-2">
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
              const alreadyPresent = w.isPresent === true || w.is_present === true;
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
                    {alreadyPresent && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Present
                      </span>
                    )}
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
  const nameParts = splitWorkerName(worker);
  const missing = new Set(worker.isMissing || []);
  const apiEmail = worker.email || "";
  const showEmail = missing.has("email") || !String(apiEmail).trim();
  const initialRole = isPlaceholderRole(worker.role) ? "" : worker.role || "";

  const [form, setForm] = useState({
    firstname: nameParts.firstname,
    lastname: nameParts.lastname,
    othername: nameParts.othername,
    email: apiEmail,
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
    isValidOptionalEmail(form.email);

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
      await markMeetingWorkerPresent(worker.id, payload, token);
      onDone();
    } catch (err) {
      toast.error(err.message || "Failed to mark present. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyPresent) {
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

      <div className="rounded-lg border border-ink-200 bg-ink-100 px-4 py-3">
        <p className="text-sm font-medium text-ink">Review and update your details</p>
        <p className="text-xs text-ink-500 mt-0.5">
          Edit any field below, then mark yourself present.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-firstname" required>First Name</Label>
          <input
            id="edit-firstname"
            type="text"
            placeholder="Enter first name"
            value={form.firstname}
            onChange={set("firstname")}
            className={inputClass}
          />
          <FieldError message={errors.firstname} />
        </div>
        <div>
          <Label htmlFor="edit-lastname" required>Last Name</Label>
          <input
            id="edit-lastname"
            type="text"
            placeholder="Enter last name"
            value={form.lastname}
            onChange={set("lastname")}
            className={inputClass}
          />
          <FieldError message={errors.lastname} />
        </div>
        <div>
          <Label htmlFor="edit-othername">Other Name</Label>
          <input
            id="edit-othername"
            type="text"
            placeholder="Optional"
            value={form.othername}
            onChange={set("othername")}
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="edit-phone" required>Phone Number</Label>
          <input
            id="edit-phone"
            type="tel"
            placeholder="07044208143 or +234..."
            value={form.phone}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^\d+]/g, "");
              setForm((prev) => ({ ...prev, phone: cleaned }));
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            className={inputClass}
          />
          <FieldError message={errors.phone} />
        </div>
        {showEmail && (
          <div className="sm:col-span-2">
            <Label htmlFor="edit-email">Email Address</Label>
            <input
              id="edit-email"
              type="email"
              placeholder="Optional"
              value={form.email}
              onChange={set("email")}
              className={inputClass}
            />
            <FieldError message={errors.email} />
          </div>
        )}
        <div>
          <Label htmlFor="edit-role" required>Role</Label>
          <select id="edit-role" value={form.role} onChange={set("role")} className={selectClass}>
            <option value="">Select Role</option>
            {PRESENT_ROLE_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
            {form.role &&
              !isPlaceholderRole(form.role) &&
              !PRESENT_ROLE_OPTIONS.includes(form.role) && (
                <option value={form.role}>{form.role}</option>
              )}
          </select>
          <FieldError message={errors.role} />
        </div>
        <div>
          <Label htmlFor="edit-team" required>Team</Label>
          <select id="edit-team" value={form.team} onChange={setTeam} className={selectClass}>
            <option value="">Select Team</option>
            {teamsAndDepartments.map((t) => (
              <option key={t.team} value={t.team}>{t.team}</option>
            ))}
          </select>
          <FieldError message={errors.team} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="edit-department" required>Department</Label>
          <select
            id="edit-department"
            value={form.department}
            onChange={set("department")}
            className={selectClass}
            disabled={!form.team}
          >
            <option value="">{form.team ? "Select Department" : "Select team first"}</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            {form.department && !departmentOptions.includes(form.department) && (
              <option value={form.department}>{form.department}</option>
            )}
          </select>
          <FieldError message={errors.department} />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !canMarkPresent}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-8 py-3 text-sm font-medium text-cream transition hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Mark Present"}
        </button>
      </div>
    </form>
  );
}

function CreatePresentWorkerStep({ searchedName, token, onBack, onDone }) {
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
    if (form.team === "Districts" && !form.district_sub_team)
      errs.district_sub_team = "District/Sub-team is required";
    if (!form.department) errs.department = "Department is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
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
        meeting_date: MEETING_DATE,
        present: true,
      };
      await createMeetingWorker(payload, token);
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
          Please fill in all required fields below. You will be marked present after submitting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="create-firstname" required>First Name</Label>
          <input id="create-firstname" type="text" placeholder="Enter first name"
            value={form.firstname} onChange={set("firstname")} className={inputClass} />
          <FieldError message={errors.firstname} />
        </div>
        <div>
          <Label htmlFor="create-lastname" required>Last Name</Label>
          <input id="create-lastname" type="text" placeholder="Enter last name"
            value={form.lastname} onChange={set("lastname")} className={inputClass} />
          <FieldError message={errors.lastname} />
        </div>
        <div>
          <Label htmlFor="create-othername">Other Name</Label>
          <input id="create-othername" type="text" placeholder="Optional"
            value={form.othername} onChange={set("othername")} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="create-gender" required>Gender</Label>
          <select id="create-gender" value={form.gender} onChange={set("gender")} className={selectClass}>
            <option value="">Select Gender</option>
            {DROPDOWN_OPTIONS.Gender.map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.gender} />
        </div>
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
        <div>
          <Label htmlFor="create-email" required>Email Address</Label>
          <input id="create-email" type="email" placeholder="you@example.com"
            value={form.email} onChange={set("email")} className={inputClass} />
          <FieldError message={errors.email} />
        </div>
        <div>
          <Label htmlFor="create-role" required>Worker Role</Label>
          <select id="create-role" value={form.role} onChange={set("role")} className={selectClass}>
            <option value="">Select Worker Role</option>
            {DROPDOWN_OPTIONS["Worker Role"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.role} />
        </div>
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
        <div>
          <Label htmlFor="create-maritalstatus" required>Marital Status</Label>
          <select id="create-maritalstatus" value={form.maritalstatus} onChange={set("maritalstatus")} className={selectClass}>
            <option value="">Select Marital Status</option>
            {DROPDOWN_OPTIONS["Marital Status"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.maritalstatus} />
        </div>
        <div>
          <Label htmlFor="create-agerange" required>Age Range</Label>
          <select id="create-agerange" value={form.agerange} onChange={set("agerange")} className={selectClass}>
            <option value="">Select Age Range</option>
            {DROPDOWN_OPTIONS["Age Range"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.agerange} />
        </div>
        <div>
          <Label htmlFor="create-employment" required>Employment Status</Label>
          <select id="create-employment" value={form.employment} onChange={set("employment")} className={selectClass}>
            <option value="">Select Employment Status</option>
            {DROPDOWN_OPTIONS["Employment Status"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <FieldError message={errors.employment} />
        </div>
        <div>
          <Label htmlFor="create-occupation" required>Occupation</Label>
          <input id="create-occupation" type="text" placeholder="Enter occupation"
            value={form.occupation} onChange={set("occupation")} className={inputClass} />
          <FieldError message={errors.occupation} />
        </div>
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
          {isSubmitting ? "Submitting..." : "Add & Mark Present"}
        </button>
      </div>
    </form>
  );
}

function SuccessScreen({ onBackToSearch }) {
  return (
    <div className="text-center py-8 space-y-5">
      <div className="space-y-3">
        <CheckCircleIcon className="mx-auto h-14 w-14 text-forest" />
        <h2 className="text-2xl font-semibold text-ink">You Are Marked Present</h2>
        <p className="text-sm text-ink-500 leading-relaxed max-w-sm mx-auto">
          Your attendance has been recorded. Welcome to the meeting.
        </p>
      </div>
      <button
        type="button"
        onClick={onBackToSearch}
        className="inline-flex items-center justify-center rounded-lg bg-ink px-6 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
      >
        Mark another person
      </button>
    </div>
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

export default function LeadersMeetingPresent() {
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionError, setSessionError] = useState(false);
  const initCalled = useRef(false);

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

  const handleBackToSelect = () => {
    setSelectedWorker(null);
    setStep("select");
  };

  const handleAddNew = (name) => {
    setSearchedName(name);
    setStep("create");
  };

  const handleBackToSearch = () => {
    setResults([]);
    setSearchedName("");
    setSelectedWorker(null);
    setStep("search");
  };

  const handleDone = () => {
    setSelectedWorker((prev) =>
      prev ? { ...prev, is_present: true, isPresent: true } : prev
    );
    setResults((prev) =>
      prev.map((worker) =>
        worker.id === selectedWorker?.id
          ? { ...worker, is_present: true, isPresent: true }
          : worker
      )
    );
    setStep("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetrySession = () => {
    setSessionError(false);
    getMeetingSession()
      .then((apiKey) => setSessionToken(apiKey))
      .catch(() => setSessionError(true));
  };

  if (sessionError) {
    return (
      <Shell>
        <div className="rounded-lg border border-sienna-50 bg-sienna-50 p-6 text-center space-y-3">
          <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-sienna" />
          <p className="text-sm font-medium text-ink">Unable to start session</p>
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
        {step === "select" && (
          <p className="mt-2 text-sm text-ink-500">
            Select your name from the list below.
          </p>
        )}
        {step === "edit" && (
          <p className="mt-2 text-sm text-ink-500">
            Review and edit your details, then mark present.
          </p>
        )}
        {step === "create" && (
          <p className="mt-2 text-sm text-ink-500">
            Fill in your details to add yourself as a new worker.
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
        <CreatePresentWorkerStep
          searchedName={searchedName}
          token={sessionToken}
          onBack={handleBackToSelect}
          onDone={handleDone}
        />
      )}
      {step === "done" && <SuccessScreen onBackToSearch={handleBackToSearch} />}
    </Shell>
  );
}
