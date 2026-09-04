export const WORKER_FIELD_LABELS = {
  firstname: "First name",
  lastname: "Last name",
  email: "Email address",
  phonenumber: "Phone number",
  team: "Team",
  district_sub_team: "District / sub-team",
  department: "Department",
  workerrole: "Worker role",
  birthdate: "Date of birth",
  maritalstatus: "Marital status",
  agerange: "Age range",
  gender: "Gender",
  employment: "Employment status",
  occupation: "Occupation",
  address: "Address",
};

const REQUIRED_MESSAGE = {
  firstname: "Enter the worker's first name.",
  lastname: "Enter the worker's last name.",
  email: "Enter the worker's email address.",
  phonenumber: "Enter an 11-digit phone number.",
  team: "Select a team.",
  district_sub_team: "Select a district or sub-team.",
  department: "Select a department.",
  workerrole: "Select a worker role.",
  birthdate: "Select a day and month of birth.",
  maritalstatus: "Select a marital status.",
  agerange: "Select an age range.",
  gender: "Select a gender.",
  employment: "Select an employment status.",
  occupation: "Enter the worker's occupation.",
  address: "Enter the worker's address.",
};

export function validateAuthenticatedWorker(worker, options = {}) {
  const {
    includePlacement = true,
    requireAddress = true,
    requireOccupation = false,
    requireDistrictSubTeam = ["District", "Districts"].includes(worker?.team),
  } = options;

  const requiredFields = ["firstname", "lastname", "email", "phonenumber"];
  if (includePlacement) requiredFields.push("team", "department");
  if (requireDistrictSubTeam) requiredFields.push("district_sub_team");
  requiredFields.push(
    "workerrole",
    "birthdate",
    "maritalstatus",
    "agerange",
    "gender",
    "employment"
  );
  if (requireOccupation) requiredFields.push("occupation");
  if (requireAddress) requiredFields.push("address");

  const errors = {};
  requiredFields.forEach((field) => {
    if (!String(worker?.[field] || "").trim()) errors[field] = REQUIRED_MESSAGE[field];
  });

  const email = String(worker?.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = "Enter a valid email address, such as name@example.com.";
  }

  const phoneDigits = String(worker?.phonenumber || "").replace(/\D/g, "");
  if (worker?.phonenumber && phoneDigits.length !== 11) {
    errors.phonenumber = "Phone number must contain exactly 11 digits.";
  }

  return errors;
}

export function focusFirstWorkerError(errors) {
  const firstField = Object.keys(errors)[0];
  if (!firstField) return;

  requestAnimationFrame(() => {
    const control = document.getElementById(firstField);
    control?.focus();
    control?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  });
}

export function workerErrorProps(errors, field) {
  const hasError = Boolean(errors[field]);
  return {
    id: field,
    "aria-invalid": hasError,
    "aria-describedby": hasError ? `${field}-error` : undefined,
  };
}
