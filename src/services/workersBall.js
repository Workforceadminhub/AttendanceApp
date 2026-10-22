import apiRequest from "../utils/apiClient";
import { getUser } from "../utils/getUser";

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

  let role =
    raw.role ||
    raw.worker_role ||
    raw.workerRole ||
    raw.designation ||
    raw.worker_designation ||
    raw.position ||
    raw.title ||
    raw.leadership_role ||
    raw.leadershipRole ||
    "";

  // If role is missing from public search, resolve from session user if it's the same person
  if (!role && typeof window !== "undefined") {
    try {
      const authUser = getUser();
      if (
        authUser &&
        (String(authUser.id) === String(raw.id ?? raw.worker_id) ||
          (authUser.email && raw.email && authUser.email.toLowerCase() === raw.email.toLowerCase()) ||
          (authUser.name && fullName && authUser.name.toLowerCase() === fullName.toLowerCase()))
      ) {
        role = authUser.role || (authUser.permissionLevel === "HOD" ? "HOD" : "");
      }
    } catch {
      // ignore
    }
  }

  const rawCode =
    raw.reference_code ||
    raw.referenceCode ||
    raw.code ||
    raw.access_code ||
    raw.accessCode ||
    "";

  return {
    id: raw.id ?? raw.worker_id ?? raw.workerId,
    name: fullName,
    firstName: raw.firstName || raw.first_name || firstName,
    lastName: raw.lastName || raw.last_name || lastName,
    phone: raw.phone || raw.phone_number || "",
    email: raw.email ?? null,
    team: raw.team || raw.team_name || "",
    department: raw.department || raw.department_name || "",
    role: role || "Worker",
    code: rawCode ? String(rawCode).trim().toUpperCase() : "",
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
    data?.reference_code ||
    data?.referenceCode ||
    data?.ref_code ||
    data?.refCode ||
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
    data?.worker?.reference_code ||
    data?.worker?.code ||
    data?.worker?.accessCode ||
    data?.worker?.access_code ||
    response?.reference_code ||
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

  const role =
    data?.role ||
    data?.worker?.role ||
    data?.worker?.worker_role ||
    data?.worker_role ||
    data?.designation ||
    response?.role ||
    response?.worker?.role ||
    null;

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
    role,
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
  if (typeof raw === "string" || typeof raw === "number") {
    const code = String(raw).trim().toUpperCase();
    return {
      id: raw,
      workerId: raw,
      name: code,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "Unassigned",
      team: "Unassigned",
      role: "Worker",
      code: code,
      accessCode: code,
      attended: true,
      attendedAt: null,
      registeredAt: null,
      qrCode: null,
      raw: { code },
    };
  }

  const workerObj = raw.worker || raw.worker_details || raw.user || {};
  const fullName =
    raw.name ||
    raw.fullName ||
    raw.full_name ||
    raw.workerName ||
    raw.worker_name ||
    workerObj.name ||
    workerObj.fullName ||
    workerObj.full_name ||
    [
      raw.firstName || raw.first_name || workerObj.first_name || workerObj.firstName,
      raw.lastName || raw.last_name || workerObj.last_name || workerObj.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const rawCode =
    raw.reference_code ||
    raw.referenceCode ||
    raw.ref_code ||
    raw.refCode ||
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
    raw.pass ||
    workerObj.reference_code ||
    workerObj.referenceCode ||
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

  const rawStatus = String(
    raw.status || raw.registration_status || raw.registrationStatus || workerObj.status || ""
  )
    .trim()
    .toLowerCase();

  let status;
  if (attended) {
    status = "attended";
  } else if (rawStatus === "pending" || rawStatus === "unconfirmed") {
    status = "pending";
  } else if (rawStatus === "registered" || rawStatus === "confirmed") {
    status = "registered";
  } else if (!codeStr) {
    status = rawStatus || "pending";
  } else {
    status = "registered";
  }

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
    status,
    isPending: status === "pending",
    isRegistered: status === "registered" || (!attended && status !== "pending"),
    attended,
    attendedAt,
    registeredAt,
    qrCode: raw.qrCode || raw.qr_code || raw.qrDataUrl || raw.qr_data_url || null,
    raw,
  };
}

/**
 * Universal extractor for Workers Ball registrations and attendance.
 * Normalizes single arrays, split `{ registered, attended }` objects, Lambda proxy payloads, etc.
 */
export function extractWorkersBallRegistrations(response) {
  if (!response) {
    return {
      registrations: [],
      total: 0,
      totalRegistered: 0,
      totalAttended: 0,
      pagination: { page: 1, limit: 0, total: 0, totalPages: 1 },
      raw: response,
    };
  }

  // 1. Unpack stringified JSON (e.g. text/plain Axios response or Lambda proxy body)
  let root = response;
  if (typeof root === "string") {
    try {
      root = JSON.parse(root);
    } catch {
      return {
        registrations: [],
        total: 0,
        totalRegistered: 0,
        totalAttended: 0,
        pagination: { page: 1, limit: 0, total: 0, totalPages: 1 },
        raw: response,
      };
    }
  }

  if (root && typeof root.body === "string") {
    try {
      root = JSON.parse(root.body);
    } catch {
      // not a JSON body string
    }
  }

  // 2. Unpack data wrapper if present
  const dataWrapper =
    root && typeof root === "object" && root.data && typeof root.data === "object"
      ? root.data
      : root;

  // Helper to extract an array by key across containers
  const findArray = (...keys) => {
    for (const k of keys) {
      if (Array.isArray(dataWrapper?.[k])) return dataWrapper[k];
      if (Array.isArray(root?.[k])) return root[k];
    }
    return null;
  };

  const registeredArr =
    findArray(
      "registered",
      "registrations",
      "registered_workers",
      "registeredWorkers",
      "registered_list",
      "all"
    ) || [];

  const attendedArr =
    findArray(
      "attended",
      "attendees",
      "attended_workers",
      "attendedWorkers",
      "checked_in",
      "checkedIn",
      "scanned",
      "scanned_passes"
    ) || [];

  // General list if no split registered/attended arrays
  const generalList = Array.isArray(root)
    ? root
    : Array.isArray(dataWrapper)
      ? dataWrapper
      : findArray(
          "workers",
          "rows",
          "records",
          "items",
          "results",
          "list",
          "data"
        ) || [];

  // Fallback: If still nothing found, look for ANY array inside root or dataWrapper
  let fallbackList = [];
  if (registeredArr.length === 0 && attendedArr.length === 0 && generalList.length === 0) {
    const candidates = [root, dataWrapper];
    for (const obj of candidates) {
      if (obj && typeof obj === "object") {
        for (const val of Object.values(obj)) {
          if (Array.isArray(val) && val.length > 0) {
            fallbackList = val;
            break;
          }
        }
      }
      if (fallbackList.length > 0) break;
    }
  }

  // Build attended lookup map
  const attendedLookup = new Map();
  attendedArr.forEach((item) => {
    if (!item) return;
    if (typeof item === "string" || typeof item === "number") {
      const key = String(item).trim().toUpperCase();
      attendedLookup.set(key, { attended: true, attendedAt: null });
      return;
    }
    const norm = normalizeWorkersBallRegistrationRow(item);
    norm.attended = true;
    if (norm.id) attendedLookup.set(String(norm.id), norm);
    if (norm.workerId) attendedLookup.set(String(norm.workerId), norm);
    if (norm.code) attendedLookup.set(norm.code.toUpperCase(), norm);
    if (norm.email) attendedLookup.set(norm.email.toLowerCase(), norm);
    if (norm.phone) attendedLookup.set(norm.phone.replace(/\D/g, ""), norm);
    if (norm.name) attendedLookup.set(norm.name.toLowerCase(), norm);
  });

  const baseSource =
    registeredArr.length > 0
      ? registeredArr
      : generalList.length > 0
        ? generalList
        : fallbackList;

  const merged = new Map();

  baseSource.forEach((item) => {
    const row = normalizeWorkersBallRegistrationRow(item);
    const idKey = row.id ? String(row.id) : null;
    const workerIdKey = row.workerId ? String(row.workerId) : null;
    const codeKey = row.code ? row.code.toUpperCase() : null;
    const emailKey = row.email ? row.email.toLowerCase() : null;
    const phoneKey = row.phone ? row.phone.replace(/\D/g, "") : null;
    const nameKey = row.name ? row.name.toLowerCase() : null;

    const match =
      (idKey && attendedLookup.get(idKey)) ||
      (workerIdKey && attendedLookup.get(workerIdKey)) ||
      (codeKey && attendedLookup.get(codeKey)) ||
      (emailKey && attendedLookup.get(emailKey)) ||
      (phoneKey && attendedLookup.get(phoneKey)) ||
      (nameKey && attendedLookup.get(nameKey)) ||
      null;

    if (match) {
      row.attended = true;
      if (!row.attendedAt && match.attendedAt) {
        row.attendedAt = match.attendedAt;
      }
    }

    const uniqueId = codeKey || idKey || workerIdKey || emailKey || row.name;
    merged.set(uniqueId, row);
  });

  // Also include any items in attendedArr that weren't in baseSource
  attendedArr.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const row = normalizeWorkersBallRegistrationRow(item);
    row.attended = true;
    const uniqueId =
      (row.code ? row.code.toUpperCase() : null) ||
      (row.id ? String(row.id) : null) ||
      (row.workerId ? String(row.workerId) : null) ||
      (row.email ? row.email.toLowerCase() : null) ||
      row.name;
    if (!merged.has(uniqueId)) {
      merged.set(uniqueId, row);
    }
  });

  const registrations = Array.from(merged.values());

  const summary =
    dataWrapper?.summary ||
    root?.summary ||
    {};

  const totalPending =
    typeof summary.total_pending === "number"
      ? summary.total_pending
      : registrations.filter((r) => r.status === "pending").length;

  const totalConfirmed =
    typeof summary.total_confirmed === "number"
      ? summary.total_confirmed
      : typeof summary.total_registered === "number" && typeof summary.total_pending === "number"
        ? Math.max(0, summary.total_registered - summary.total_pending)
        : registrations.filter((r) => r.status !== "pending").length;

  // Registered count represents confirmed registrations (distinct from pending attempts)
  const totalRegistered =
    typeof summary.total_confirmed === "number"
      ? summary.total_confirmed
      : typeof root?.totalConfirmed === "number"
        ? root.totalConfirmed
        : typeof dataWrapper?.totalConfirmed === "number"
          ? dataWrapper.totalConfirmed
          : totalConfirmed;

  const totalAttended =
    typeof summary.total_attended === "number"
      ? summary.total_attended
      : typeof root?.totalAttended === "number"
        ? root.totalAttended
        : typeof dataWrapper?.totalAttended === "number"
          ? dataWrapper.totalAttended
          : typeof root?.attendedCount === "number"
            ? root.attendedCount
            : typeof dataWrapper?.attendedCount === "number"
              ? dataWrapper.attendedCount
              : attendedArr.length > 0
                ? attendedArr.length
                : registrations.filter((r) => r.attended).length;

  const total =
    typeof summary.total_registered === "number"
      ? summary.total_registered
      : typeof root?.total === "number"
        ? root.total
        : typeof dataWrapper?.total === "number"
          ? dataWrapper.total
          : registrations.length;

  return {
    registrations,
    total,
    totalRegistered,
    totalConfirmed,
    totalPending,
    totalAttended,
    summary,
    pagination: root?.pagination || dataWrapper?.pagination || {
      page: 1,
      limit: Math.max(registrations.length, 1),
      total,
      totalPages: 1,
    },
    raw: response,
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

  const queryPayload = Object.keys(query).length > 0 ? query : null;

  const response = await apiRequest(
    "GET",
    "/api/workers-ball/registrations",
    queryPayload,
    undefined,
    true
  );

  console.warn("[WorkersBall] GET /api/workers-ball/registrations response:", response);

  if (response?.success === false) {
    throw new Error(
      response?.message || "Failed to load Workers Ball registrations."
    );
  }

  return extractWorkersBallRegistrations(response);
}
