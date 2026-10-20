import apiRequest from "../utils/apiClient";

/**
 * Split a full name string ("Chidi Bede Enwereji") into { firstName, lastName }.
 */
function splitFullName(fullName = "") {
  const cleaned = String(fullName || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned) return { firstName: "", lastName: "" };
  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Normalize a worker record returned by GET /api/workers-ball/search?name=...
 */
export function normalizeWorkersBallWorker(raw = {}) {
  const fullName =
    raw.name ||
    [raw.firstName || raw.first_name, raw.lastName || raw.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  const { firstName, lastName } = splitFullName(fullName);

  const registered = Boolean(
    raw.registered ?? raw.is_registered ?? raw.isRegistered ?? false
  );

  return {
    id: raw.id ?? raw.worker_id ?? raw.workerId,
    name: fullName,
    firstName: raw.firstName || raw.first_name || firstName,
    lastName: raw.lastName || raw.last_name || lastName,
    phone: raw.phone || raw.phone_number || "",
    email: raw.email ?? null,
    team: raw.team || raw.team_name || "",
    department: raw.department || raw.department_name || "",
    role: raw.role || "Worker",
    registered,
    emailEditable:
      raw.email_editable !== undefined
        ? Boolean(raw.email_editable)
        : !registered,
    emailHelper:
      raw.email_helper ||
      "You can edit your email. Your confirmation will be sent to this address.",
  };
}

/**
 * 1. Search workers by name (public, no auth).
 * GET /api/workers-ball/search?name={query}
 */
export async function searchWorkersBall(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return [];

  const response = await apiRequest(
    "GET",
    "/api/workers-ball/search",
    { name: trimmed },
    undefined,
    false
  );

  if (response?.success === false) {
    throw new Error(response?.message || "Could not search workforce records.");
  }

  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.workers)
        ? response.workers
        : [];

  return rows.map(normalizeWorkersBallWorker);
}

/**
 * 2. Update a worker's email address before registration (public, no auth).
 * PUT /api/workers-ball/workers/{workerId}/email with { "email" }
 * Rejected by the backend if the worker is already registered.
 */
export async function updateWorkersBallEmail(workerId, email) {
  const cleanedEmail = String(email || "").trim();
  if (!workerId) {
    throw new Error("Worker ID is required to update email.");
  }
  if (!cleanedEmail) {
    throw new Error("Email address is required.");
  }

  const response = await apiRequest(
    "PUT",
    `/api/workers-ball/workers/${encodeURIComponent(workerId)}/email`,
    { email: cleanedEmail },
    undefined,
    false
  );

  if (response?.success === false) {
    throw new Error(response?.message || "Failed to update email address.");
  }

  return response?.data ?? response;
}

/**
 * 3. Request a 6-digit OTP verification code sent via Brevo (public, no auth).
 * POST /api/workers-ball/register with { "workerId" }
 */
export async function requestWorkersBallOtp(workerId) {
  if (!workerId) {
    throw new Error("Worker ID is required to request a verification code.");
  }

  const numericId = Number(workerId);
  const payload = {
    workerId: Number.isFinite(numericId) ? numericId : workerId,
  };

  const response = await apiRequest(
    "POST",
    "/api/workers-ball/register",
    payload,
    undefined,
    false
  );

  if (response?.success === false) {
    throw new Error(
      response?.message || "Failed to send verification code to your email."
    );
  }

  return response?.data ?? response;
}

/**
 * 4. Confirm the 6-digit OTP to complete Workers Ball registration (public, no auth).
 * POST /api/workers-ball/register/confirm with { "workerId", "otp" }
 * Saves one workers_ball row and emails HGWB-XXXXXX plus a QR code.
 * A second registration returns HTTP 409.
 */
export async function confirmWorkersBallRegistration(workerId, otp) {
  if (!workerId) {
    throw new Error("Worker ID is required to confirm registration.");
  }
  const cleanedOtp = String(otp || "")
    .replace(/\D/g, "")
    .slice(0, 6);
  if (cleanedOtp.length !== 6) {
    throw new Error("Please enter a valid 6-digit verification code.");
  }

  const numericId = Number(workerId);
  const payload = {
    workerId: Number.isFinite(numericId) ? numericId : workerId,
    otp: cleanedOtp,
  };

  const response = await apiRequest(
    "POST",
    "/api/workers-ball/register/confirm",
    payload,
    undefined,
    false
  );

  if (response?.success === false) {
    throw new Error(
      response?.message || "Invalid or expired verification code."
    );
  }

  const data = response?.data ?? response ?? {};

  // Extract HGWB-XXXXXX code from any common response field or message
  const messageCodeMatch = String(
    response?.message || data?.message || ""
  ).match(/HGWB-[A-Z0-9]+/i);

  const accessCode =
    data?.code ||
    data?.accessCode ||
    data?.access_code ||
    data?.registrationCode ||
    data?.registration_code ||
    data?.passCode ||
    data?.pass_code ||
    data?.workersBallCode ||
    data?.workers_ball_code ||
    response?.code ||
    response?.accessCode ||
    response?.access_code ||
    (messageCodeMatch ? messageCodeMatch[0].toUpperCase() : "");

  const qrCode =
    data?.qrCode ||
    data?.qr_code ||
    data?.qrCodeUrl ||
    data?.qr_code_url ||
    data?.qrDataUrl ||
    data?.qr_data_url ||
    data?.qr ||
    response?.qrCode ||
    response?.qr_code ||
    null;

  return {
    raw: response,
    data,
    accessCode,
    qrCode,
    message:
      response?.message ||
      data?.message ||
      "Registration confirmed! Check your email for your HGWB pass and QR code.",
  };
}
