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

  // Deep recursive search for any HGWB-XXXXXX pattern in the serialized response
  let deepMatch = null;
  try {
    const serialized = JSON.stringify(response);
    const m = serialized.match(/HGWB-[A-Z0-9]+/i);
    if (m) deepMatch = m[0].toUpperCase();
  } catch {
    // ignore serialization issues
  }

  const explicitCode =
    data?.code ||
    data?.accessCode ||
    data?.access_code ||
    data?.registrationCode ||
    data?.registration_code ||
    data?.ticketCode ||
    data?.ticket_code ||
    data?.ticket ||
    data?.passCode ||
    data?.pass_code ||
    data?.pass ||
    data?.badgeCode ||
    data?.badge_code ||
    data?.badge ||
    data?.ref ||
    data?.reference ||
    data?.workersBallCode ||
    data?.workers_ball_code ||
    data?.workers_ball?.code ||
    data?.workers_ball?.accessCode ||
    data?.workers_ball?.access_code ||
    data?.worker?.code ||
    data?.worker?.accessCode ||
    data?.worker?.access_code ||
    response?.code ||
    response?.accessCode ||
    response?.access_code ||
    response?.ticket ||
    (messageCodeMatch ? messageCodeMatch[0].toUpperCase() : "") ||
    deepMatch;

  const fallbackCode = workerId
    ? `HGWB-${String(workerId).padStart(6, "0")}`
    : "HGWB-2026";

  const accessCode = explicitCode || fallbackCode;

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

/**
 * Asynchronously decode text payload from a QR code data URL using `jsqr`.
 * Returns the decoded string (e.g. "HGWB-Z5WNHQ") or null.
 */
export async function decodeQrCodeDataUrl(qrDataUrl) {
  if (
    !qrDataUrl ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return null;
  }
  try {
    const jsQRModule = await import("jsqr");
    const jsQR = jsQRModule.default || jsQRModule;
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const result = jsQR(
            imageData.data,
            imageData.width,
            imageData.height
          );
          resolve(result?.data || null);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = qrDataUrl;
    });
  } catch {
    return null;
  }
}

/**
 * 5. Scan a Workers Ball pass at the accreditation desk (public, no auth).
 * POST /api/workers-ball/scan with { "scan": "HGWB-AB23CD" }
 * Sets the worker as attended and returns attended: true with their name.
 * Scanning the same code again returns "Already attended" and does not check them in a second time.
 */
export async function scanWorkersBallPass(scanText) {
  const cleanedScan = String(scanText || "").trim();
  if (!cleanedScan) {
    throw new Error("Please scan a valid pass or enter an access code.");
  }

  // Extract HGWB-XXXXXX if the scanner returned a URL or formatted text
  const match = cleanedScan.match(/HGWB-[A-Z0-9]+/i);
  const scanPayload = match ? match[0].toUpperCase() : cleanedScan.toUpperCase();

  try {
    const response = await apiRequest(
      "POST",
      "/api/workers-ball/scan",
      { scan: scanPayload },
      undefined,
      false
    );

    if (response?.success === false) {
      const msg = response?.message || "Accreditation check-in failed.";
      if (/already\s+attended/i.test(msg)) {
        return {
          success: true,
          attended: true,
          alreadyAttended: true,
          code: scanPayload,
          name: response?.data?.name || response?.name || "",
          message: "Already attended",
          raw: response,
        };
      }
      throw new Error(msg);
    }

    const data = response?.data ?? response ?? {};
    const message = String(response?.message || data?.message || "");
    const isAlreadyAttended =
      /already\s+attended/i.test(message) ||
      data?.alreadyAttended === true ||
      data?.status === "already_attended";

    const workerName =
      data?.name ||
      data?.workerName ||
      data?.worker?.name ||
      response?.name ||
      "";

    return {
      success: true,
      attended: Boolean(data?.attended ?? true),
      alreadyAttended: isAlreadyAttended,
      code: scanPayload,
      name: workerName,
      department: data?.department || data?.worker?.department || "",
      team: data?.team || data?.worker?.team || "",
      role: data?.role || data?.worker?.role || "",
      message: message || (isAlreadyAttended ? "Already attended" : "Check-in confirmed"),
      raw: response,
    };
  } catch (err) {
    const errMsg = String(err?.message || "");
    if (/already\s+attended/i.test(errMsg)) {
      const respData = err?.responseData?.data || err?.responseData || {};
      return {
        success: true,
        attended: true,
        alreadyAttended: true,
        code: scanPayload,
        name: respData?.name || respData?.workerName || "",
        department: respData?.department || "",
        team: respData?.team || "",
        role: respData?.role || "",
        message: "Already attended",
        raw: err?.responseData,
      };
    }
    throw err;
  }
}

/**
 * Normalize an individual registration row returned by GET /api/workers-ball/registrations.
 */
export function normalizeWorkersBallRegistrationRow(raw = {}) {
  const workerObj = raw.worker || raw.worker_details || {};
  const fullName =
    raw.name ||
    raw.workerName ||
    raw.worker_name ||
    workerObj.name ||
    [
      raw.firstName || raw.first_name || workerObj.first_name || workerObj.firstName,
      raw.lastName || raw.last_name || workerObj.last_name || workerObj.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const rawCode =
    raw.code ||
    raw.accessCode ||
    raw.access_code ||
    raw.registrationCode ||
    raw.registration_code ||
    raw.ticketCode ||
    raw.ticket_code ||
    raw.passCode ||
    raw.pass_code ||
    raw.badgeCode ||
    raw.badge_code ||
    raw.badge ||
    raw.ticket ||
    workerObj.code ||
    workerObj.accessCode ||
    workerObj.access_code ||
    "";

  const attendedAt =
    raw.attended_at ||
    raw.attendedAt ||
    raw.checked_in_at ||
    raw.checkedInAt ||
    raw.scanned_at ||
    raw.scannedAt ||
    null;

  const hasAttendedFlag =
    raw.attended !== undefined
      ? Boolean(raw.attended)
      : raw.is_attended !== undefined
        ? Boolean(raw.is_attended)
        : raw.isAttended !== undefined
          ? Boolean(raw.isAttended)
          : raw.has_attended !== undefined
            ? Boolean(raw.has_attended)
            : raw.checked_in !== undefined
              ? Boolean(raw.checked_in)
              : raw.checkedIn !== undefined
                ? Boolean(raw.checkedIn)
                : raw.status !== undefined
                  ? raw.status === "attended" || raw.status === "checked_in"
                  : null;

  const attended = hasAttendedFlag !== null ? hasAttendedFlag : Boolean(attendedAt);

  const registeredAt =
    raw.registered_at ||
    raw.registeredAt ||
    raw.created_at ||
    raw.createdAt ||
    raw.timestamp ||
    raw.date ||
    null;

  const codeStr = String(rawCode || "").trim().toUpperCase();

  return {
    id: raw.id ?? raw.workerId ?? raw.worker_id ?? workerObj.id,
    workerId: raw.workerId ?? raw.worker_id ?? raw.id ?? workerObj.id,
    name: fullName || "Unnamed Worker",
    firstName: raw.firstName || raw.first_name || workerObj.firstName || "",
    lastName: raw.lastName || raw.last_name || workerObj.lastName || "",
    email: raw.email || raw.workerEmail || raw.worker_email || workerObj.email || "",
    phone:
      raw.phone ||
      raw.phone_number ||
      raw.phoneNumber ||
      workerObj.phone ||
      workerObj.phone_number ||
      "",
    department:
      raw.department ||
      raw.department_name ||
      raw.departmentName ||
      workerObj.department ||
      workerObj.department_name ||
      "Unassigned",
    team:
      raw.team ||
      raw.team_name ||
      raw.teamName ||
      workerObj.team ||
      workerObj.team_name ||
      "Unassigned",
    role: raw.role || raw.designation || workerObj.role || "Worker",
    code: codeStr,
    accessCode: codeStr,
    attended,
    attendedAt,
    registeredAt,
    qrCode: raw.qrCode || raw.qr_code || raw.qrDataUrl || raw.qr_data_url || null,
    raw,
  };
}

/**
 * 6. Fetch Workers Ball registrations & attendance status (Super Admin only, auth required).
 * GET /api/workers-ball/registrations
 *
 * Query params (optional):
 * - search: string
 * - department: string
 * - team: string
 * - status: 'all' | 'attended' | 'not_attended'
 * - page: number
 * - limit: number
 */
export async function fetchWorkersBallRegistrations(params = {}) {
  const query = {};
  if (params.search && String(params.search).trim()) {
    query.search = String(params.search).trim();
  }
  if (params.department && params.department !== "All Departments" && params.department !== "All") {
    query.department = params.department;
  }
  if (params.team && params.team !== "All Teams" && params.team !== "All") {
    query.team = params.team;
  }
  if (params.status && params.status !== "all" && params.status !== "All") {
    query.status = params.status;
  }
  if (params.page) {
    query.page = params.page;
  }
  if (params.limit) {
    query.limit = params.limit;
  }

  const response = await apiRequest(
    "GET",
    "/api/workers-ball/registrations",
    query,
    undefined,
    true
  );

  if (response?.success === false) {
    throw new Error(
      response?.message || "Failed to load Workers Ball registrations."
    );
  }

  const payload = response?.data ?? response ?? {};
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.registrations)
      ? payload.registrations
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.workers)
          ? payload.workers
          : Array.isArray(payload.rows)
            ? payload.rows
            : [];

  const registrations = rawList.map(normalizeWorkersBallRegistrationRow);

  const total =
    typeof payload?.pagination?.total === "number"
      ? payload.pagination.total
      : typeof payload?.total === "number"
        ? payload.total
        : typeof response?.total === "number"
          ? response.total
          : registrations.length;

  const totalAttended =
    typeof payload?.totalAttended === "number"
      ? payload.totalAttended
      : typeof payload?.attendedCount === "number"
        ? payload.attendedCount
        : typeof response?.totalAttended === "number"
          ? response.totalAttended
          : registrations.filter((r) => r.attended).length;

  const totalRegistered =
    typeof payload?.totalRegistered === "number"
      ? payload.totalRegistered
      : typeof payload?.registeredCount === "number"
        ? payload.registeredCount
        : typeof response?.totalRegistered === "number"
          ? response.totalRegistered
          : total;

  return {
    registrations,
    total,
    totalRegistered,
    totalAttended,
    pagination: payload?.pagination || {
      page: params.page || 1,
      limit: params.limit || Math.max(registrations.length, 1),
      total,
      totalPages: Math.ceil(total / (params.limit || Math.max(registrations.length, 1))),
    },
    raw: response,
  };
}
