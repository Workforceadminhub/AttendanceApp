import BirthDatePicker from "../BirthDatePicker";
import { DROPDOWN_OPTIONS } from "../../utils/sampleWorkersExcel";
import { getCommunityCluster } from "../../utils/teams";
import { workerErrorProps } from "../../utils/workerFormValidation";

const CONTROL =
  "w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10";
const DISTRICT_CLUSTERS = ["Pastor Biola Cluster", "Pastor Isaac Cluster"];

const isDistrictTeam = (team) => team === "Districts" || team === "District";

function Field({ id, label, required, wide, children }) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-700 mb-2">
        {label} {required && <span className="text-brick">*</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * The worker detail fields shared by every add-worker screen.
 * `placement` ({ teams, departmentOptions }) adds the Team and Department pickers;
 * without it the department is fixed by the page and `team` only decides whether
 * the district cluster picker shows.
 */
export default function WorkerFormFields({
  worker,
  onChange,
  errors,
  placement = null,
  team = "",
  occupationRequired = false,
}) {
  const set = (patch) => onChange({ ...worker, ...patch });
  const activeTeam = placement ? worker.team : team;
  const cluster = worker.district_sub_team || worker.cluster || "";

  // Control ids are the field names: the error summary and first-error focus look them up by id.
  const textInput = (field, label, { required = false, placeholder, type = "text" } = {}) => (
    <Field id={field} label={label} required={required}>
      <input
        {...workerErrorProps(errors, field)}
        type={type}
        value={worker[field]}
        onChange={(e) => set({ [field]: e.target.value })}
        className={CONTROL}
        placeholder={placeholder}
      />
    </Field>
  );

  const select = (field, label, options, placeholder) => (
    <Field id={field} label={label} required>
      <select
        {...workerErrorProps(errors, field)}
        value={worker[field]}
        onChange={(e) => set({ [field]: e.target.value })}
        className={CONTROL}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {textInput("firstname", "First Name", { required: true, placeholder: "Enter first name" })}
      {textInput("lastname", "Last Name", { required: true, placeholder: "Enter last name" })}
      {textInput("othername", "Other Name", { placeholder: "Enter other name" })}
      {select("gender", "Gender", DROPDOWN_OPTIONS.Gender, "Select Gender")}

      <Field id="phonenumber" label="Phone Number" required>
        <input
          {...workerErrorProps(errors, "phonenumber")}
          type="tel"
          value={worker.phonenumber}
          onChange={(e) => set({ phonenumber: e.target.value.replace(/\D/g, "").slice(0, 11) })}
          maxLength={11}
          className={CONTROL}
          placeholder="Enter 11-digit phone number"
        />
      </Field>

      {textInput("email", "Email Address", {
        required: true,
        type: "email",
        placeholder: "Enter email address",
      })}

      {placement && (
        <Field id="team" label="Team" required>
          <select
              {...workerErrorProps(errors, "team")}
            value={worker.team}
            onChange={(e) =>
              set({ team: e.target.value, department: "", district_sub_team: "", cluster: "" })
            }
            className={CONTROL}
          >
            <option value="">Select Team</option>
            {placement.teams.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {isDistrictTeam(activeTeam) && (
        <Field id="district_sub_team" label="District/Sub-team (Optional)">
          <select
              {...workerErrorProps(errors, "district_sub_team")}
            value={cluster}
            onChange={(e) => set({ district_sub_team: e.target.value, cluster: e.target.value })}
            className={CONTROL}
          >
            <option value="">Select District/Sub-team</option>
            {DISTRICT_CLUSTERS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>
      )}

      {placement && (
        <Field id="department" label="Department" required>
          <select
              {...workerErrorProps(errors, "department")}
            value={worker.department}
            onChange={(e) => {
              const department = e.target.value;
              const next =
                cluster || !isDistrictTeam(worker.team) ? cluster : getCommunityCluster(department) || "";
              set({ department, district_sub_team: next, cluster: next });
            }}
            disabled={!worker.team}
            className={`${CONTROL} disabled:cursor-not-allowed disabled:bg-ink-100`}
          >
            <option value="">{worker.team ? "Select Department" : "Select a team first"}</option>
            {placement.departmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {select("workerrole", "Worker Role", DROPDOWN_OPTIONS["Worker Role"], "Select Worker Role")}

      <Field id="birthdate" label="Birth Date" required>
        <BirthDatePicker
          id="birthdate"
          ariaInvalid={Boolean(errors.birthdate)}
          ariaDescribedBy={errors.birthdate ? "birthdate-error" : undefined}
          value={worker.birthdate}
          onChange={(value) => set({ birthdate: value })}
          placeholder="Select birth date (e.g. 12th January)"
        />
      </Field>

      {select("maritalstatus", "Marital Status", DROPDOWN_OPTIONS["Marital Status"], "Select Marital Status")}
      {select("agerange", "Age Range", DROPDOWN_OPTIONS["Age Range"], "Select Age Range")}
      {select("employment", "Employment Status", DROPDOWN_OPTIONS["Employment Status"], "Select Employment Status")}
      {textInput("occupation", "Occupation", {
        required: occupationRequired,
        placeholder: "Enter occupation",
      })}

      <Field id="address" label="Address" required wide>
        <textarea
          {...workerErrorProps(errors, "address")}
          value={worker.address}
          onChange={(e) => set({ address: e.target.value })}
          className={CONTROL}
          placeholder="Enter address"
          rows={3}
        />
      </Field>
    </div>
  );
}
