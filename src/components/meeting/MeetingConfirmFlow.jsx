import { useState } from "react";
import { toast } from "react-toastify";
import { CheckCircleIcon, XCircleIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import BirthDatePicker from "../BirthDatePicker";
import { DROPDOWN_OPTIONS } from "../../utils/sampleWorkersExcel";
import { updateMeetingWorker } from "../../services/meeting";
import {
  BackButton,
  CONFIRM_SUCCESS_COPY,
  DistrictSubTeamField,
  FieldError,
  Label,
  MissingBadge,
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
import {
  ELEVEN_DIGIT_PHONE_MESSAGE,
  isDistrictsTeam,
  isElevenDigitPhone,
  isValidEmail,
  phoneDigits,
} from "../../utils/meeting/validation";

const MEETING_LABEL = { leaders: "Leaders Meeting", workers: "Workers Meeting" };

const STEP_HINT = {
  select: "Select your name from the results below.",
  edit: "Review and complete your information.",
  create: "Fill in your details to add yourself as a new worker.",
};

function StatusNotice({ tone, title, children, onBack }) {
  const confirmed = tone === "confirmed";
  const Icon = confirmed ? CheckCircleIcon : XCircleIcon;
  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />
      <div
        className={`rounded-lg border px-5 py-6 flex items-start gap-4 ${
          confirmed ? "border-forest-200 bg-forest-50" : "border-sienna-200 bg-sienna-50"
        }`}
      >
        <Icon className={`h-6 w-6 shrink-0 mt-0.5 ${confirmed ? "text-forest" : "text-sienna"}`} />
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-xs text-ink-500 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}

/** Step 3: review missing details and answer the attendance question. */
function EditWorkerStep({ worker, meetingType, meetingDate, token, onBack, onDone }) {
  const alreadyConfirmed = worker.isConfirmed === true || worker.is_confirmed === true;
  const alreadyDeclined = worker.isConfirmed === false || worker.is_confirmed === false;
  const missing = new Set(worker.isMissing || []);
  const hasMissing = missing.size > 0;
  const showDistrictSubTeam = isDistrictsTeam(worker.team) || missing.has("district_sub_team");

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

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  const set = (field) => (e) => setField(field, e.target.value);

  const validate = () => {
    const errs = {};
    if (!attending) errs.attending = "Please select whether you will be attending";
    if (attending === "no" && !declineReason.trim()) errs.declineReason = "Please provide a reason";
    if (showDistrictSubTeam && !form.district_sub_team.trim()) {
      errs.district_sub_team = "District/Sub-team is required";
    }
    if (hasMissing) {
      if (missing.has("email")) {
        if (!form.email.trim()) errs.email = "Email is required";
        else if (!isValidEmail(form.email)) errs.email = "Invalid email address";
      }
      if (missing.has("phone")) {
        if (!form.phone.trim()) errs.phone = "Phone is required";
        else if (!isElevenDigitPhone(form.phone)) errs.phone = ELEVEN_DIGIT_PHONE_MESSAGE;
      }
      if (missing.has("gender") && !form.gender) errs.gender = "Gender is required";
      if (missing.has("maritalstatus") && !form.maritalstatus) errs.maritalstatus = "Marital status is required";
      if (missing.has("agerange") && !form.agerange) errs.agerange = "Age range is required";
      if (missing.has("address") && !form.address.trim()) errs.address = "Address is required";
      if (missing.has("employment") && !form.employment) errs.employment = "Employment status is required";
      if (missing.has("occupation") && !form.occupation.trim()) errs.occupation = "Occupation is required";
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
    setIsSubmitting(true);
    try {
      const isConfirmed = attending === "yes";
      const payload = { meeting_date: meetingDate, is_confirmed: isConfirmed };
      if (!isConfirmed) payload.notes = declineReason.trim();
      if (showDistrictSubTeam && form.district_sub_team.trim()) {
        payload.district_sub_team = form.district_sub_team.trim();
      }
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
      }
      await updateMeetingWorker(worker.id, payload, token, meetingType);
      onDone(isConfirmed ? "confirm" : "decline");
    } catch (err) {
      toast.error(err.message || "Update failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const you = worker.name ? `${worker.name}, you` : "You";

  if (alreadyConfirmed) {
    return (
      <StatusNotice tone="confirmed" title="Already confirmed" onBack={onBack}>
        {you} have already confirmed your attendance for this meeting. No further action is needed.
      </StatusNotice>
    );
  }

  if (alreadyDeclined) {
    return (
      <StatusNotice tone="declined" title="Not attending" onBack={onBack}>
        {you} have indicated that you will not be attending this meeting. No further action is needed.
      </StatusNotice>
    );
  }

  const badge = <MissingBadge />;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <BackButton onClick={onBack} />

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

      {/* District/Sub-team always before Department when Team is Districts */}
      {showDistrictSubTeam && (
        <DistrictSubTeamField
          id="edit-district-sub-team"
          value={form.district_sub_team}
          onChange={set("district_sub_team")}
          error={errors.district_sub_team}
          badge={missing.has("district_sub_team") ? badge : null}
        />
      )}

      {!hasMissing ? (
        <>
          <div className="rounded-lg border border-forest-50 bg-forest-50 px-4 py-3">
            <p className="text-sm text-forest font-medium">
              {showDistrictSubTeam
                ? "Confirm District/Sub-team above, then answer the attendance question."
                : "Your details are complete. Nothing to update."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {worker.role && <ReadonlyField label="Role" value={worker.role} />}
            {worker.team && <ReadonlyField label="Team" value={worker.team} />}
            {worker.department && <ReadonlyField label="Department" value={worker.department} />}
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
            {worker.team && <ReadonlyField label="Team" value={worker.team} />}
            {worker.department && <ReadonlyField label="Department" value={worker.department} />}
          </div>

          <p className="text-xs text-ink-500">
            Please complete the fields marked <MissingBadge /> below.
          </p>

          {missing.has("email") && (
            <div>
              <Label htmlFor="edit-email" required>Email Address {badge}</Label>
              <input id="edit-email" type="email" placeholder="you@example.com"
                value={form.email} onChange={set("email")} className={inputClass} />
              <FieldError message={errors.email} />
            </div>
          )}

          {missing.has("phone") && (
            <div>
              <Label htmlFor="edit-phone" required>Phone Number {badge}</Label>
              <input
                id="edit-phone"
                type="tel"
                placeholder="11 digits"
                value={form.phone}
                maxLength={11}
                onChange={(e) => setField("phone", phoneDigits(e.target.value).slice(0, 11))}
                className={inputClass}
              />
              <FieldError message={errors.phone} />
            </div>
          )}

          {missing.has("gender") && (
            <div>
              <Label htmlFor="edit-gender" required>Gender {badge}</Label>
              <select id="edit-gender" value={form.gender} onChange={set("gender")} className={selectClass}>
                <option value="">Select</option>
                {DROPDOWN_OPTIONS.Gender.map((o) => <option key={o}>{o}</option>)}
              </select>
              <FieldError message={errors.gender} />
            </div>
          )}

          {missing.has("maritalstatus") && (
            <div>
              <Label htmlFor="edit-maritalstatus" required>Marital Status {badge}</Label>
              <select id="edit-maritalstatus" value={form.maritalstatus} onChange={set("maritalstatus")} className={selectClass}>
                <option value="">Select</option>
                {DROPDOWN_OPTIONS["Marital Status"].map((o) => <option key={o}>{o}</option>)}
              </select>
              <FieldError message={errors.maritalstatus} />
            </div>
          )}

          {missing.has("agerange") && (
            <div>
              <Label htmlFor="edit-agerange" required>Age Range {badge}</Label>
              <select id="edit-agerange" value={form.agerange} onChange={set("agerange")} className={selectClass}>
                <option value="">Select</option>
                {DROPDOWN_OPTIONS["Age Range"].map((o) => <option key={o}>{o}</option>)}
              </select>
              <FieldError message={errors.agerange} />
            </div>
          )}

          {missing.has("role") && (
            <div>
              <Label htmlFor="edit-role">Role {badge}</Label>
              <select id="edit-role" value={form.role} onChange={set("role")} className={selectClass}>
                <option value="">Select Role</option>
                {DROPDOWN_OPTIONS["Worker Role"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          )}

          {missing.has("birthdate") && (
            <div>
              <Label htmlFor="edit-birthdate">Date of Birth {badge}</Label>
              <BirthDatePicker
                id="edit-birthdate"
                value={form.birthdate}
                onChange={(val) => setField("birthdate", val)}
              />
            </div>
          )}

          {missing.has("address") && (
            <div>
              <Label htmlFor="edit-address" required>Address {badge}</Label>
              <input id="edit-address" type="text" placeholder="e.g. 12 Example Street, Gbagada, Lagos"
                value={form.address} onChange={set("address")} className={inputClass} />
              <FieldError message={errors.address} />
            </div>
          )}

          {missing.has("employment") && (
            <div>
              <Label htmlFor="edit-employment" required>Employment Status {badge}</Label>
              <select id="edit-employment" value={form.employment} onChange={set("employment")} className={selectClass}>
                <option value="">Select</option>
                {DROPDOWN_OPTIONS["Employment Status"].map((o) => <option key={o}>{o}</option>)}
              </select>
              <FieldError message={errors.employment} />
            </div>
          )}

          {missing.has("occupation") && (
            <div>
              <Label htmlFor="edit-occupation" required>Occupation {badge}</Label>
              <input id="edit-occupation" type="text" placeholder="e.g. Engineer"
                value={form.occupation} onChange={set("occupation")} className={inputClass} />
              <FieldError message={errors.occupation} />
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
            onClick={() => { setAttending("yes"); setErrors((p) => ({ ...p, attending: undefined, declineReason: undefined })); }}
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

      {attending === "no" && (
        <div>
          <Label htmlFor="edit-decline-reason" required>Reason for not attending</Label>
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
        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
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

/**
 * Public "confirm your attendance" flow: search, select, edit/create, done.
 *
 * @param {{ meetingType: "leaders"|"workers" }} props
 */
export default function MeetingConfirmFlow({ meetingType }) {
  const { meetingDate, displayDate } = useMeetingDate(meetingType);
  const title = `${MEETING_LABEL[meetingType] || "Meeting"} - ${displayDate}`;

  const [step, setStep] = useState("search"); // search | select | edit | create | done
  const [results, setResults] = useState([]);
  const [searchedName, setSearchedName] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [doneVariant, setDoneVariant] = useState(null);

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

  const handleDone = (variant) => {
    setDoneVariant(variant || "confirm");
    if ((variant === "confirm" || variant === "decline") && selectedWorker) {
      const flag = variant === "confirm";
      const patch = { is_confirmed: flag, isConfirmed: flag };
      setSelectedWorker({ ...selectedWorker, ...patch });
      setResults((prev) => prev.map((w) => (w.id === selectedWorker.id ? { ...w, ...patch } : w)));
    }
    setStep("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const successCopy = CONFIRM_SUCCESS_COPY[doneVariant] || CONFIRM_SUCCESS_COPY.confirm;

  return (
    <Shell title={title}>
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-500 mb-1">{title}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink leading-snug">
          Confirm Your Attendance
        </h1>
        {STEP_HINT[step] && <p className="mt-2 text-sm text-ink-500">{STEP_HINT[step]}</p>}
      </div>

      {step === "search" && (
        <NameSearchStep
          onResults={handleResults}
          meetingDate={meetingDate}
          meetingType={meetingType}
          hint="Enter your first name and surname so we can find your record."
        />
      )}
      {step === "select" && (
        <SelectWorkerStep
          mode="confirm"
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
        <EditWorkerStep
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
          mode="confirm"
          meetingType={meetingType}
          meetingDate={meetingDate}
          searchedName={searchedName}
          onBack={handleBackToSelect}
          onDone={handleDone}
        />
      )}
      {step === "done" && <SuccessScreen title={successCopy.title} message={successCopy.message} />}
    </Shell>
  );
}
