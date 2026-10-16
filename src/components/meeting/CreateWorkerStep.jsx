import { useState } from "react";
import { toast } from "react-toastify";
import BirthDatePicker from "../BirthDatePicker";
import { DROPDOWN_OPTIONS } from "../../utils/sampleWorkersExcel";
import { createMeetingWorker, createLeadersCampusRegistration } from "../../services/meeting";
import {
  BackButton,
  DistrictSubTeamField,
  FieldError,
  Label,
  inputClass,
  primaryButtonClass,
  selectClass,
} from "./atoms";
import useLiveTeamDepartments from "./useLiveTeamDepartments";
import {
  ELEVEN_DIGIT_PHONE_MESSAGE,
  PRESENT_PHONE_MESSAGE,
  isDistrictsTeam,
  isElevenDigitPhone,
  isValidEmail,
  isValidPresentPhone,
  phoneDigits,
  splitWorkerName,
} from "../../utils/meeting/validation";

export const LEADERS_MEETING_CAMPUSES = [
  "Gbagada",
  "Magodo",
  "Ikorodu",
  "Jericho",
  "Yaba",
  "Ilupeju",
  "Akobo",
  "Apapa",
  "Port Harcourt",
  "Oluyole",
  "Surulere",
  "Ogba",
  "Toronto",
];

const COPY = {
  confirm: {
    intro: "Please fill in all required fields below.",
    submit: "Add Worker",
  },
  present: {
    intro: "Please fill in all required fields below. You will be marked present after submitting.",
    submit: "Add & Mark Present",
  },
};

/**
 * "Add yourself as a new worker" form shared by the confirm and present flows.
 *
 * @param {"confirm"|"present"} props.mode
 *   confirm: phone must be exactly 11 digits, worker is created with is_confirmed: true.
 *   present: phone follows the present-flow rule (10-14 digits), worker is created
 *   with the present flag for the meeting type.
 * @param {"leaders"|"workers"} props.meetingType
 * @param {string} props.meetingDate  YYYY-MM-DD
 */
export default function CreateWorkerStep({
  mode,
  meetingType,
  meetingDate,
  searchedName,
  token = null,
  onBack,
  onDone,
}) {
  const initialNames = splitWorkerName({ name: searchedName });
  const [form, setForm] = useState({
    ...initialNames,
    campus: "Gbagada",
    email: "",
    phone: "",
    gender: "",
    role: "",
    customRole: "",
    birthdate: "",
    maritalstatus: "",
    agerange: "",
    address: "",
    employment: "",
    occupation: "",
    team: "",
    customTeam: "",
    district_sub_team: "",
    department: "",
    customDepartment: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPresent = mode === "present";
  const isLeadersPresent = isPresent && meetingType === "leaders";
  const isOtherCampus = isLeadersPresent && Boolean(form.campus) && form.campus !== "Gbagada";
  const copy = COPY[mode] || COPY.confirm;
  const districts = !isOtherCampus && isDistrictsTeam(form.team);

  const { teamOptions, departmentOptions } = useLiveTeamDepartments(
    form.team,
    form.district_sub_team,
    { requireDistrictSubTeam: !isOtherCampus }
  );

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  const set = (field) => (e) => setField(field, e.target.value);

  const setCampus = (e) => {
    const nextCampus = e.target.value;
    const returningToGbagada = nextCampus === "Gbagada";
    setForm((prev) => ({
      ...prev,
      campus: nextCampus,
      role: returningToGbagada && prev.role === "Others" ? "" : prev.role,
      customRole: returningToGbagada ? "" : prev.customRole,
      team: returningToGbagada && prev.team === "Others" ? "" : prev.team,
      customTeam: returningToGbagada ? "" : prev.customTeam,
      department: returningToGbagada && prev.department === "Others" ? "" : prev.department,
      customDepartment: returningToGbagada ? "" : prev.customDepartment,
    }));
    setErrors((prev) => ({
      ...prev,
      campus: undefined,
      role: undefined,
      customRole: undefined,
      team: undefined,
      customTeam: undefined,
      department: undefined,
      customDepartment: undefined,
    }));
  };

  const setRole = (e) => {
    const nextRole = e.target.value;
    setForm((prev) => ({
      ...prev,
      role: nextRole,
      customRole: nextRole === "Others" ? prev.customRole : "",
    }));
    setErrors((prev) => ({ ...prev, role: undefined, customRole: undefined }));
  };

  const setTeam = (e) => {
    const nextTeam = e.target.value;
    setForm((prev) => ({
      ...prev,
      team: nextTeam,
      customTeam: nextTeam === "Others" ? prev.customTeam : "",
      district_sub_team: "",
      department: isOtherCampus && nextTeam === "Others" ? "Others" : "",
      customDepartment: "",
    }));
    setErrors((prev) => ({
      ...prev,
      team: undefined,
      customTeam: undefined,
      district_sub_team: undefined,
      department: undefined,
      customDepartment: undefined,
    }));
  };

  const setDepartment = (e) => {
    const nextDepartment = e.target.value;
    setForm((prev) => ({
      ...prev,
      department: nextDepartment,
      customDepartment: nextDepartment === "Others" ? prev.customDepartment : "",
    }));
    setErrors((prev) => ({ ...prev, department: undefined, customDepartment: undefined }));
  };

  const setDistrictSubTeam = (e) => {
    setForm((prev) => ({ ...prev, district_sub_team: e.target.value, department: "", customDepartment: "" }));
    setErrors((prev) => ({ ...prev, district_sub_team: undefined, department: undefined, customDepartment: undefined }));
  };

  const setPhone = (e) => {
    const value = isPresent
      ? e.target.value.replace(/[^\d+]/g, "")
      : phoneDigits(e.target.value).slice(0, 11);
    setField("phone", value);
  };

  const validate = () => {
    const errs = {};
    if (isLeadersPresent && !form.campus) errs.campus = "Campus is required";
    if (!form.firstname.trim()) errs.firstname = "First name is required";
    if (!form.lastname.trim()) errs.lastname = "Last name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (isPresent && !isValidPresentPhone(form.phone)) errs.phone = PRESENT_PHONE_MESSAGE;
    else if (!isPresent && !isElevenDigitPhone(form.phone)) errs.phone = ELEVEN_DIGIT_PHONE_MESSAGE;
    if (!form.role) errs.role = "Worker role is required";
    else if (isOtherCampus && form.role === "Others" && !form.customRole.trim()) {
      errs.customRole = "Please enter your worker role";
    }
    if (!form.team) errs.team = "Team is required";
    else if (isOtherCampus && form.team === "Others" && !form.customTeam.trim()) {
      errs.customTeam = "Please enter your team";
    }
    if (districts && !form.district_sub_team) errs.district_sub_team = "District/Sub-team is required";
    if (!form.department) errs.department = "Department is required";
    else if (isOtherCampus && form.department === "Others" && !form.customDepartment.trim()) {
      errs.customDepartment = "Please enter your department";
    }

    if (!isOtherCampus) {
      if (!form.email.trim()) errs.email = "Email is required";
      else if (!isValidEmail(form.email)) errs.email = "Invalid email address";
      if (!form.gender) errs.gender = "Gender is required";
      if (!form.birthdate) errs.birthdate = "Date of birth is required";
      if (!form.maritalstatus) errs.maritalstatus = "Marital status is required";
      if (!form.agerange) errs.agerange = "Age range is required";
      if (!form.employment) errs.employment = "Employment status is required";
      if (!form.occupation.trim()) errs.occupation = "Occupation is required";
      if (!form.address.trim()) errs.address = "Address is required";
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
      if (isOtherCampus) {
        const resolvedRole = form.role === "Others" ? form.customRole.trim() : form.role;
        const resolvedTeam = form.team === "Others" ? form.customTeam.trim() : form.team;
        const resolvedDepartment =
          form.department === "Others" ? form.customDepartment.trim() : form.department;
        const payload = {
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          phone: phoneDigits(form.phone),
          department: resolvedDepartment,
          team: resolvedTeam,
          role: resolvedRole,
          campus: form.campus,
          meeting_date: meetingDate,
        };
        await createLeadersCampusRegistration(payload);
      } else {
        const payload = {
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          othername: form.othername.trim() || undefined,
          email: form.email.trim(),
          phone: phoneDigits(form.phone),
          gender: form.gender,
          role: form.role,
          birthdate: form.birthdate,
          maritalstatus: form.maritalstatus,
          agerange: form.agerange,
          address: form.address.trim(),
          employment: form.employment,
          occupation: form.occupation.trim(),
          team: form.team,
          district_sub_team: districts ? form.district_sub_team : undefined,
          department: form.department,
          meeting_date: meetingDate,
        };
        if (isPresent) {
          // The leaders and workers endpoints historically received different flag names.
          if (meetingType === "workers") payload.is_present = true;
          else payload.present = true;
        } else {
          payload.is_confirmed = true;
        }
        await createMeetingWorker(payload, token, meetingType);
      }
      onDone("create");
    } catch (err) {
      toast.error(err.message || "Failed to add worker. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <BackButton onClick={onBack} />

      <div className="rounded-lg border border-ink-200 bg-ink-100 px-4 py-3">
        <p className="text-sm font-medium text-ink">Add Yourself as a New Worker</p>
        <p className="text-xs text-ink-500 mt-0.5">{copy.intro}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLeadersPresent && (
          <div className="sm:col-span-2">
            <Label htmlFor="create-campus" required>Campus</Label>
            <select id="create-campus" value={form.campus} onChange={setCampus} className={selectClass}>
              {LEADERS_MEETING_CAMPUSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <FieldError message={errors.campus} />
          </div>
        )}

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

        {!isOtherCampus && (
          <>
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
          </>
        )}

        <div>
          <Label htmlFor="create-phone" required>Phone Number</Label>
          <input
            id="create-phone"
            type="tel"
            placeholder={isPresent ? "07044208143 or +234..." : "11 digits"}
            value={form.phone}
            maxLength={isPresent ? undefined : 11}
            onChange={setPhone}
            className={inputClass}
          />
          <FieldError message={errors.phone} />
        </div>

        {!isOtherCampus && (
          <div>
            <Label htmlFor="create-email" required>Email Address</Label>
            <input id="create-email" type="email" placeholder="you@example.com"
              value={form.email} onChange={set("email")} className={inputClass} />
            <FieldError message={errors.email} />
          </div>
        )}

        <div>
          <Label htmlFor="create-role" required>Worker Role</Label>
          <select id="create-role" value={form.role} onChange={setRole} className={selectClass}>
            <option value="">Select Worker Role</option>
            {DROPDOWN_OPTIONS["Worker Role"].map((o) => <option key={o}>{o}</option>)}
            {isOtherCampus && !DROPDOWN_OPTIONS["Worker Role"].includes("Others") && (
              <option value="Others">Others</option>
            )}
          </select>
          <FieldError message={errors.role} />
          {isOtherCampus && form.role === "Others" && (
            <div className="mt-3">
              <Label htmlFor="create-custom-role" required>Specify Worker Role</Label>
              <input
                id="create-custom-role"
                type="text"
                placeholder="Enter your worker role"
                value={form.customRole}
                onChange={set("customRole")}
                className={inputClass}
              />
              <FieldError message={errors.customRole} />
            </div>
          )}
        </div>

        {!isOtherCampus && (
          <>
            <div>
              <Label htmlFor="create-birthdate" required>Date of Birth (day and month)</Label>
              <BirthDatePicker
                id="create-birthdate"
                value={form.birthdate}
                onChange={(value) => setField("birthdate", value)}
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
          </>
        )}

        <div className="sm:col-span-2">
          <Label htmlFor="create-team" required>Team</Label>
          <select id="create-team" value={form.team} onChange={setTeam} className={selectClass}>
            <option value="">Select Team</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            {isOtherCampus && !teamOptions.includes("Others") && (
              <option value="Others">Others</option>
            )}
          </select>
          <FieldError message={errors.team} />
          {isOtherCampus && form.team === "Others" && (
            <div className="mt-3">
              <Label htmlFor="create-custom-team" required>Specify Team</Label>
              <input
                id="create-custom-team"
                type="text"
                placeholder="Enter your team"
                value={form.customTeam}
                onChange={set("customTeam")}
                className={inputClass}
              />
              <FieldError message={errors.customTeam} />
            </div>
          )}
        </div>

        {/* District/Sub-team always comes before Department when the team is Districts */}
        {districts && (
          <DistrictSubTeamField
            id="create-district-sub-team"
            className="sm:col-span-2"
            value={form.district_sub_team}
            onChange={setDistrictSubTeam}
            error={errors.district_sub_team}
          />
        )}

        {form.team && (
          <div className="sm:col-span-2">
            <Label htmlFor="create-department" required>Department</Label>
            <select
              id="create-department"
              value={form.department}
              onChange={setDepartment}
              className={selectClass}
              disabled={districts && !form.district_sub_team}
            >
              <option value="">
                {districts && !form.district_sub_team
                  ? "Select District/Sub-team first"
                  : "Select Department"}
              </option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
              {isOtherCampus && !departmentOptions.includes("Others") && (
                <option value="Others">Others</option>
              )}
            </select>
            <FieldError message={errors.department} />
            {isOtherCampus && form.department === "Others" && (
              <div className="mt-3">
                <Label htmlFor="create-custom-department" required>Specify Department</Label>
                <input
                  id="create-custom-department"
                  type="text"
                  placeholder="Enter your department"
                  value={form.customDepartment}
                  onChange={set("customDepartment")}
                  className={inputClass}
                />
                <FieldError message={errors.customDepartment} />
              </div>
            )}
          </div>
        )}

        {!isOtherCampus && (
          <div className="sm:col-span-2">
            <Label htmlFor="create-address" required>Address</Label>
            <textarea
              id="create-address"
              rows={3}
              placeholder="Enter address"
              value={form.address}
              onChange={set("address")}
              className={inputClass}
            />
            <FieldError message={errors.address} />
          </div>
        )}
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "Submitting..." : copy.submit}
        </button>
      </div>
    </form>
  );
}
