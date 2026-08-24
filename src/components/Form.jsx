import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { workerRoles, filterDepartmentsForDistrictSubTeam } from "../utils/teams";
import { getEffectiveRouteList } from "../utils/routeObject";
import { fetchTeamsAndDepartmentsForFilter } from "../services/departments";
import BirthDatePicker from "./BirthDatePicker";

const inputClass =
  "qc-input t-input aria-[invalid=true]:border-brick aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-brick/10";

function Field({ id, label, required = false, error, hint, children, className = "" }) {
  return (
    <div className={`t-input-wrap ${error ? "is-error" : ""} ${className}`}>
      <label htmlFor={id} className="qc-label text-ink-700">
        {label}
        {required && <span className="ml-1 text-brick" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="t-error-msg mt-1.5 text-xs font-medium text-brick">
          {error}
        </p>
      )}
    </div>
  );
}

const Form = ({
  formData,
  setFormData,
  handleSubmit,
  isLoading,
  errors = {},
  setErrors,
}) => {
  const [filterData, setFilterData] = useState({
    teams: [],
    departments: [],
    departmentsByTeam: {},
  });

  useEffect(() => {
    const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (isLocalPreview) return undefined;

    let isMounted = true;
    fetchTeamsAndDepartmentsForFilter()
      .then((data) => {
        if (isMounted) setFilterData(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const routeList = getEffectiveRouteList();
  const apiTeamList = (filterData.teams || [])
    .filter((team) => {
      const value = String(team?.value || team?.label || team || "").trim().toLowerCase();
      return value !== "all" && value !== "gbagada campus" && value !== "gbagada";
    })
    .map((team) => team.value);

  const teamList = (
    apiTeamList.length > 0
      ? apiTeamList
      : Array.from(new Set(routeList.map((item) => item.team).filter(Boolean))).sort()
  ).filter((team) => {
    const normalized = String(team || "").trim().toLowerCase();
    return normalized !== "gbagada campus" && normalized !== "gbagada";
  });

  let departmentList = [];
  if (formData.team) {
    const departments =
      filterData.departmentsByTeam?.[formData.team] ||
      filterData.departmentsByTeam?.[formData.team === "Districts" ? "District" : formData.team] ||
      [];
    const source = departments.length
      ? departments
      : routeList
          .filter(
            (route) =>
              route.team === formData.team ||
              (formData.team === "Districts" && route.team === "District") ||
              (formData.team === "District" && route.team === "Districts")
          )
          .map((route) => route.department)
          .filter(Boolean);

    departmentList = filterDepartmentsForDistrictSubTeam(
      source,
      formData.team,
      formData.district_sub_team
    );
    if (formData.department && !departmentList.includes(formData.department)) {
      departmentList = [formData.department, ...departmentList];
    }
  }

  const updateField = (field, value, extra = {}) => {
    setFormData((current) => ({ ...current, [field]: value, ...extra }));
    const input = document.getElementById(field);
    input?.closest(".t-input-wrap")?.classList.remove("is-error");
    input?.classList.remove("is-error", "is-shaking");
    if (errors[field]) {
      setErrors?.((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  const errorCount = Object.keys(errors).length;
  const errorProps = (field) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {errorCount > 0 && (
        <div role="alert" className="rounded-md border border-brick/30 bg-brick/5 px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">
            Check {errorCount === 1 ? "the highlighted field" : `${errorCount} highlighted fields`}.
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Your information is still here. Fix the details below and submit again.
          </p>
        </div>
      )}

      <section aria-labelledby="worker-details-heading" className="space-y-5">
        <div className="border-b border-ink-200 pb-3">
          <h2 id="worker-details-heading" className="text-lg font-semibold text-ink-900">Worker details</h2>
          <p className="mt-1 text-sm text-ink-500">Use the worker's current contact information.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="firstname" label="First name" required error={errors.firstname}>
            <input id="firstname" type="text" autoComplete="given-name" className={inputClass} value={formData.firstname} onChange={(event) => updateField("firstname", event.target.value)} {...errorProps("firstname")} />
          </Field>
          <Field id="lastname" label="Last name" required error={errors.lastname}>
            <input id="lastname" type="text" autoComplete="family-name" className={inputClass} value={formData.lastname} onChange={(event) => updateField("lastname", event.target.value)} {...errorProps("lastname")} />
          </Field>
          <Field id="othername" label="Middle name" hint="Optional">
            <input id="othername" type="text" autoComplete="additional-name" className={inputClass} value={formData.othername} onChange={(event) => updateField("othername", event.target.value)} />
          </Field>
          <Field id="email" label="Email address" required error={errors.email}>
            <input id="email" type="email" inputMode="email" autoComplete="email" className={inputClass} value={formData.email} onChange={(event) => updateField("email", event.target.value)} {...errorProps("email")} />
          </Field>
          <Field id="phonenumber" label="Phone number" required error={errors.phonenumber} hint="Enter 11 digits, for example 08012345678.">
            <input id="phonenumber" type="tel" inputMode="numeric" autoComplete="tel" maxLength={11} className={inputClass} value={formData.phonenumber} onChange={(event) => updateField("phonenumber", event.target.value.replace(/\D/g, "").slice(0, 11))} {...errorProps("phonenumber")} />
          </Field>
          <Field id="nameofrequester" label="Requested by" required error={errors.nameofrequester} hint="Name of the leader or administrator submitting this request.">
            <input id="nameofrequester" type="text" className={inputClass} value={formData.nameofrequester} onChange={(event) => updateField("nameofrequester", event.target.value)} {...errorProps("nameofrequester")} />
          </Field>
        </div>
      </section>

      <section aria-labelledby="ministry-placement-heading" className="space-y-5">
        <div className="border-b border-ink-200 pb-3">
          <h2 id="ministry-placement-heading" className="text-lg font-semibold text-ink-900">Ministry placement</h2>
          <p className="mt-1 text-sm text-ink-500">Choose the team before selecting a department.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="team" label="Team" required error={errors.team}>
            <select id="team" className={inputClass} value={formData.team} onChange={(event) => updateField("team", event.target.value, { department: "", district_sub_team: "" })} {...errorProps("team")}>
              <option value="">Select a team</option>
              {teamList.map((team) => <option key={team}>{team}</option>)}
            </select>
          </Field>

          {(formData.team === "Districts" || formData.team === "District") && (
            <Field id="district_sub_team" label="District / sub-team" required>
              <select id="district_sub_team" className={inputClass} value={formData.district_sub_team || ""} onChange={(event) => updateField("district_sub_team", event.target.value, { department: "" })}>
                <option value="">Select a district or sub-team</option>
                <option value="Pastor Biola Cluster">Pastor Biola Cluster</option>
                <option value="Pastor Isaac Cluster">Pastor Isaac Cluster</option>
              </select>
            </Field>
          )}

          <Field id="department" label="Department" required error={errors.department}>
            <select id="department" className={inputClass} value={formData.department} onChange={(event) => updateField("department", event.target.value)} disabled={!formData.team || ((formData.team === "Districts" || formData.team === "District") && !formData.district_sub_team)} {...errorProps("department")}>
              <option value="">
                {!formData.team ? "Select a team first" : (formData.team === "Districts" || formData.team === "District") && !formData.district_sub_team ? "Select a district or sub-team first" : "Select a department"}
              </option>
              {departmentList.map((department) => <option key={department}>{department}</option>)}
            </select>
          </Field>

          <Field id="workerrole" label="Worker role" required error={errors.workerrole}>
            <select id="workerrole" className={inputClass} value={formData.workerrole} onChange={(event) => updateField("workerrole", event.target.value)} {...errorProps("workerrole")}>
              <option value="">Select a worker role</option>
              {workerRoles.map((role) => <option key={role}>{role}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section aria-labelledby="profile-details-heading" className="space-y-5">
        <div className="border-b border-ink-200 pb-3">
          <h2 id="profile-details-heading" className="text-lg font-semibold text-ink-900">Profile details</h2>
          <p className="mt-1 text-sm text-ink-500">These details support worker care and reporting.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="gender" label="Gender" required error={errors.gender}>
            <select id="gender" className={inputClass} value={formData.gender || ""} onChange={(event) => updateField("gender", event.target.value)} {...errorProps("gender")}>
              <option value="">Select gender</option>
              <option>Female</option>
              <option>Male</option>
            </select>
          </Field>

          <Field id="maritalstatus" label="Marital status" required error={errors.maritalstatus}>
            <select id="maritalstatus" className={inputClass} value={formData.maritalstatus || ""} onChange={(event) => updateField("maritalstatus", event.target.value)} {...errorProps("maritalstatus")}>
              <option value="">Select marital status</option>
              <option>Single</option>
              <option>Married</option>
            </select>
          </Field>

          <Field id="birthdate" label="Date of birth" required error={errors.birthdate} hint="Day and month only.">
            <BirthDatePicker id="birthdate" value={formData.birthdate || ""} onChange={(value) => updateField("birthdate", value)} placeholder="Select day and month" className="w-full" ariaInvalid={Boolean(errors.birthdate)} ariaDescribedBy={errors.birthdate ? "birthdate-error" : undefined} />
          </Field>

          <Field id="agerange" label="Age range" required error={errors.agerange}>
            <select id="agerange" className={inputClass} value={formData.agerange || ""} onChange={(event) => updateField("agerange", event.target.value)} {...errorProps("agerange")}>
              <option value="">Select age range</option>
              {["18-25", "26-30", "31-35", "36-40", "41-45", "46-50", "51 & Above"].map((range) => <option key={range}>{range}</option>)}
            </select>
          </Field>

          <Field id="employment" label="Employment status" required error={errors.employment} className="sm:col-span-2">
            <select id="employment" className={inputClass} value={formData.employment || ""} onChange={(event) => updateField("employment", event.target.value)} {...errorProps("employment")}>
              <option value="">Select employment status</option>
              <option>Employed</option>
              <option>Self-employed</option>
              <option>Student</option>
              <option>Unemployed</option>
            </select>
          </Field>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:justify-end">
        <Link to="/" className="qc-btn-secondary sm:min-w-28">Cancel</Link>
        <button type="submit" disabled={isLoading} className="qc-btn-primary sm:min-w-44">
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              Submitting request…
            </>
          ) : "Submit for review"}
        </button>
      </div>
    </form>
  );
};

export default Form;
