import { useState } from "react";
import { toast } from "react-toastify";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { DROPDOWN_OPTIONS } from "../../utils/sampleWorkersExcel";
import { markMeetingWorkerPresent } from "../../services/meeting";
import {
  BackButton,
  DistrictSubTeamField,
  FieldError,
  Label,
  ReadonlyField,
  Shell,
  SuccessScreen,
  inputClass,
  primaryButtonClass,
  selectClass,
} from "./atoms";
import NameSearchStep from "./NameSearchStep";
import SelectWorkerStep from "./SelectWorkerStep";
import CreateWorkerStep from "./CreateWorkerStep";
import useMeetingDate from "./useMeetingDate";
import useLiveTeamDepartments from "./useLiveTeamDepartments";
import {
  PRESENT_PHONE_MESSAGE,
  isDistrictsTeam,
  isValidOptionalEmail,
  isValidPresentPhone,
  splitWorkerName,
} from "../../utils/meeting/validation";

const MEETING_LABEL = { leaders: "Leaders Meeting", workers: "Workers Meeting" };

const STEP_HINT = {
  select: "Select your name from the list below.",
  edit: "Review and edit your details, then mark present.",
  create: "Fill in your details to add yourself as a new worker.",
};

/** "Worker" is the placeholder role imported with bulk uploads; it must be replaced before marking present. */
const isPlaceholderRole = (role) => String(role || "").trim().toLowerCase() === "worker";

const PRESENT_ROLE_OPTIONS = DROPDOWN_OPTIONS["Worker Role"].filter((role) => !isPlaceholderRole(role));

const workerPhone = (worker) => worker.phone || worker.phonenumber || worker.phone_number || "";

/** Step 3: review details, then mark present. */
function EditPresentStep({ worker, meetingType, meetingDate, token, onBack, onDone }) {
  const alreadyPresent = worker.isPresent === true || worker.is_present === true;
  const nameParts = splitWorkerName(worker);
  const missing = new Set(worker.isMissing || []);
  const showEmail = missing.has("email");

  const [form, setForm] = useState({
    firstname: nameParts.firstname,
    lastname: nameParts.lastname,
    othername: nameParts.othername,
    email: worker.email || "",
    role: isPlaceholderRole(worker.role) ? "" : worker.role || "",
    department: worker.department || "",
    team: worker.team || "",
    district_sub_team: worker.district_sub_team || "",
    phone: workerPhone(worker),
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { teamOptions, departmentOptions } = useLiveTeamDepartments(
    form.team,
    form.district_sub_team
  );

  const districts = isDistrictsTeam(form.team);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  const set = (field) => (e) => setField(field, e.target.value);

  const setTeam = (e) => {
    setForm((prev) => ({ ...prev, team: e.target.value, district_sub_team: "", department: "" }));
    setErrors((prev) => ({ ...prev, team: undefined, district_sub_team: undefined, department: undefined }));
  };

  const setDistrictSubTeam = (e) => {
    setForm((prev) => ({ ...prev, district_sub_team: e.target.value, department: "" }));
    setErrors((prev) => ({ ...prev, district_sub_team: undefined, department: undefined }));
  };

  const canMarkPresent =
    Boolean(form.firstname.trim()) &&
    Boolean(form.lastname.trim()) &&
    isValidPresentPhone(form.phone) &&
    Boolean(form.role.trim()) &&
    !isPlaceholderRole(form.role) &&
    Boolean(form.team) &&
    (!districts || Boolean(form.district_sub_team)) &&
    Boolean(form.department) &&
    (!showEmail || isValidOptionalEmail(form.email));

  const validate = () => {
    const errs = {};
    if (!form.firstname.trim()) errs.firstname = "First name is required";
    if (!form.lastname.trim()) errs.lastname = "Last name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!isValidPresentPhone(form.phone)) errs.phone = PRESENT_PHONE_MESSAGE;
    if (!form.role.trim() || isPlaceholderRole(form.role)) errs.role = "Please select a role";
    if (!form.team) errs.team = "Team is required";
    if (districts && !form.district_sub_team) errs.district_sub_team = "District/Sub-team is required";
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
        meeting_date: meetingDate,
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        othername: form.othername.trim() || undefined,
        role: form.role.trim(),
        department: form.department,
        team: form.team,
        phone: form.phone.trim(),
      };
      if (districts) payload.district_sub_team = form.district_sub_team;
      if (showEmail && form.email.trim()) payload.email = form.email.trim();
      await markMeetingWorkerPresent(worker.id, payload, token, meetingType);
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
        <BackButton onClick={onBack} />
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
            <ReadonlyField label="Phone Number" value={workerPhone(worker)} />
            {worker.email ? <ReadonlyField label="Email Address" value={worker.email} /> : null}
            <ReadonlyField label="Role" value={worker.role} />
            <ReadonlyField label="Team" value={worker.team} />
            <ReadonlyField label="Department" value={worker.department} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <BackButton onClick={onBack} />

      <div className="rounded-lg border border-ink-200 bg-ink-100 px-4 py-3">
        <p className="text-sm font-medium text-ink">Review and update your details</p>
        <p className="text-xs text-ink-500 mt-0.5">Edit any field below, then mark yourself present.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-firstname" required>First Name</Label>
          <input id="edit-firstname" type="text" placeholder="Enter first name"
            value={form.firstname} onChange={set("firstname")} className={inputClass} />
          <FieldError message={errors.firstname} />
        </div>
        <div>
          <Label htmlFor="edit-lastname" required>Last Name</Label>
          <input id="edit-lastname" type="text" placeholder="Enter last name"
            value={form.lastname} onChange={set("lastname")} className={inputClass} />
          <FieldError message={errors.lastname} />
        </div>
        <div>
          <Label htmlFor="edit-othername">Other Name</Label>
          <input id="edit-othername" type="text" placeholder="Optional"
            value={form.othername} onChange={set("othername")} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="edit-phone" required>Phone Number</Label>
          <input
            id="edit-phone"
            type="tel"
            placeholder="07044208143 or +234..."
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value.replace(/[^\d+]/g, ""))}
            className={inputClass}
          />
          <FieldError message={errors.phone} />
        </div>
        {showEmail && (
          <div className="sm:col-span-2">
            <Label htmlFor="edit-email">Email Address</Label>
            <input id="edit-email" type="email" placeholder="Optional"
              value={form.email} onChange={set("email")} className={inputClass} />
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
            {form.role && !isPlaceholderRole(form.role) && !PRESENT_ROLE_OPTIONS.includes(form.role) && (
              <option value={form.role}>{form.role}</option>
            )}
          </select>
          <FieldError message={errors.role} />
        </div>
        <div>
          <Label htmlFor="edit-team" required>Team</Label>
          <select id="edit-team" value={form.team} onChange={setTeam} className={selectClass}>
            <option value="">Select Team</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <FieldError message={errors.team} />
        </div>
        {districts && (
          <DistrictSubTeamField
            id="edit-district-sub-team"
            className="sm:col-span-2"
            value={form.district_sub_team}
            onChange={setDistrictSubTeam}
            error={errors.district_sub_team}
          />
        )}
        <div className="sm:col-span-2">
          <Label htmlFor="edit-department" required>Department</Label>
          <select
            id="edit-department"
            value={form.department}
            onChange={set("department")}
            className={selectClass}
            disabled={!form.team || (districts && !form.district_sub_team)}
          >
            <option value="">
              {!form.team
                ? "Select team first"
                : districts && !form.district_sub_team
                  ? "Select District/Sub-team first"
                  : "Select Department"}
            </option>
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
        <button type="submit" disabled={isSubmitting || !canMarkPresent} className={primaryButtonClass}>
          {isSubmitting ? "Submitting..." : "Mark Present"}
        </button>
      </div>
    </form>
  );
}

/**
 * Public "mark yourself present" flow: search, select, edit/create, done.
 *
 * @param {{ meetingType: "leaders"|"workers" }} props
 */
export default function MeetingPresentFlow({ meetingType }) {
  const { meetingDate, displayDate } = useMeetingDate(meetingType);
  const title = `${MEETING_LABEL[meetingType] || "Meeting"} Attendance - ${displayDate}`;

  const [step, setStep] = useState("search"); // search | select | edit | create | done
  const [results, setResults] = useState([]);
  const [searchedName, setSearchedName] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);

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
    if (selectedWorker) {
      const patch = { is_present: true, isPresent: true };
      setSelectedWorker({ ...selectedWorker, ...patch });
      setResults((prev) => prev.map((w) => (w.id === selectedWorker.id ? { ...w, ...patch } : w)));
    }
    setStep("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Shell title={title}>
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-500 mb-1">{title}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink leading-snug">
          Mark Your Attendance
        </h1>
        {STEP_HINT[step] && <p className="mt-2 text-sm text-ink-500">{STEP_HINT[step]}</p>}
      </div>

      {step === "search" && (
        <NameSearchStep
          onResults={handleResults}
          meetingDate={meetingDate}
          meetingType={meetingType}
          hint={`Enter your name to mark your attendance for the ${MEETING_LABEL[meetingType] || "meeting"}.`}
        />
      )}
      {step === "select" && (
        <SelectWorkerStep
          mode="present"
          workers={results}
          searchedName={searchedName}
          onSelect={handleSelect}
          onBack={handleBackToSearch}
          onRetrySearch={handleResults}
          onAddNew={handleAddNew}
          meetingDate={meetingDate}
          meetingType={meetingType}
        />
      )}
      {step === "edit" && selectedWorker && (
        <EditPresentStep
          worker={selectedWorker}
          meetingType={meetingType}
          meetingDate={meetingDate}
          token={null}
          onBack={handleBackToSelect}
          onDone={handleDone}
        />
      )}
      {step === "create" && (
        <CreateWorkerStep
          mode="present"
          meetingType={meetingType}
          meetingDate={meetingDate}
          searchedName={searchedName}
          onBack={handleBackToSelect}
          onDone={handleDone}
        />
      )}
      {step === "done" && (
        <SuccessScreen
          title="You Are Marked Present"
          message="Your attendance has been recorded. Welcome to the meeting."
          actionLabel="Mark another person"
          onAction={handleBackToSearch}
        />
      )}
    </Shell>
  );
}
