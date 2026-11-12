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

  const fetchByQuery = async (q) => {
    const response = await apiRequest(
      "GET",
      "/api/workers-ball/search",
      { name: q },
      undefined,
      false
    );

    if (response?.success === false) {
      throw new Error(
        response?.message || "Could not search workforce records."
      );
    }

    const rows = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.workers)
          ? response.workers
          : [];

    return rows.map(normalizeWorkersBallWorker);
  };

  const primaryResults = await fetchByQuery(trimmed);
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

  if (primaryResults.length > 0 || tokens.length <= 1) {
    return primaryResults;
  }

  // Fallback for multi-word searches (e.g. "grace nw" matching "Grace Chizoba Nwannukwu")
  const firstTokenResults = await fetchByQuery(tokens[0]);
  return firstTokenResults.filter((w) => {
    const haystack = [
      w.name,
      w.firstName,
      w.lastName,
      w.email,
      w.phone,
      w.department,
      w.team,
      w.role,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return tokens.every((tok) => haystack.includes(tok));
  });
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
  } else if (rawStatus === "pending" || rawStatus === "unconfirmed" || rawStatus === "invited") {
    status = "pending";
  } else if (rawStatus === "registered" || rawStatus === "confirmed") {
    status = "registered";
  } else if (!codeStr) {
    status = rawStatus || "pending";
  } else {
    status = "registered";
  }

  const inviteToken =
    raw.token ||
    raw.invite_token ||
    raw.inviteToken ||
    workerObj.token ||
    workerObj.invite_token ||
    workerObj.inviteToken ||
    "";

  const inviteUrl =
    raw.invite_url ||
    raw.inviteUrl ||
    workerObj.invite_url ||
    workerObj.inviteUrl ||
    (inviteToken && typeof window !== "undefined"
      ? `${window.location.origin}/workers-ball/invite?token=${encodeURIComponent(inviteToken)}`
      : "");

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
    inviteToken,
    inviteUrl,
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

/**
 * 7. Send Workers Ball invites to one or more workers (Super Admin only, auth required).
 * POST /api/workers-ball/invites with { "workerIds": [18, ...] }
 *
 * Returns:
 * {
 *   total,
 *   sentCount,
 *   skippedCount,
 *   sent: [{ workerId, email, inviteUrl, token }],
 *   skipped: [...],
 *   message,
 *   raw
 * }
 */
export const WORKERS_BALL_INVITE_BATCH_LIMIT = 200;

export async function sendWorkersBallInvites(workerIds) {
  const rawList = Array.isArray(workerIds) ? workerIds : [workerIds];
  const cleanedIds = Array.from(
    new Set(
      rawList
        .filter((id) => id !== undefined && id !== null && String(id).trim() !== "")
        .map((id) => {
          const num = Number(id);
          return Number.isFinite(num) ? num : id;
        })
    )
  );

  if (cleanedIds.length === 0) {
    throw new Error("Please select at least one worker to invite.");
  }

  const normalizeSentItem = (item) => {
    const inviteUrl = item?.invite_url || item?.inviteUrl || "";
    let token = item?.token || item?.invite_token || "";
    if (!token && inviteUrl) {
      try {
        const parsed = new URL(
          inviteUrl,
          typeof window !== "undefined" ? window.location.origin : "https://attendance.hiccgbagada.com"
        );
        token = parsed.searchParams.get("token") || "";
      } catch {
        // ignore URL parse issues
      }
    }
    return {
      workerId: item?.worker_id ?? item?.workerId ?? item?.id,
      name: item?.name || item?.worker_name || "",
      email: item?.email || "",
      inviteUrl,
      token,
      raw: item,
    };
  };

  const normalizeSkippedItem = (item) => {
    if (typeof item === "string" || typeof item === "number") {
      return { workerId: item, reason: "Skipped", raw: item };
    }
    return {
      workerId: item?.worker_id ?? item?.workerId ?? item?.id,
      name: item?.name || item?.worker_name || "",
      email: item?.email || "",
      reason: item?.reason || item?.message || item?.status || "Already invited or missing email",
      raw: item,
    };
  };

  const chunks = [];
  for (let i = 0; i < cleanedIds.length; i += WORKERS_BALL_INVITE_BATCH_LIMIT) {
    chunks.push(cleanedIds.slice(i, i + WORKERS_BALL_INVITE_BATCH_LIMIT));
  }

  const allSent = [];
  const allSkipped = [];
  let totalProcessed = 0;
  let totalSentCount = 0;
  let totalSkippedCount = 0;
  let lastMessage = "";
  const rawResponses = [];

  for (const chunk of chunks) {
    const response = await apiRequest(
      "POST",
      "/api/workers-ball/invites",
      { workerIds: chunk },
      undefined,
      true
    );

    if (response?.success === false) {
      throw new Error(
        response?.message || "Failed to send Workers Ball invitations."
      );
    }

    rawResponses.push(response);
    const data = response?.data ?? response ?? {};
    const sentRaw = Array.isArray(data.sent) ? data.sent : [];
    const skippedRaw = Array.isArray(data.skipped) ? data.skipped : [];

    const sent = sentRaw.map(normalizeSentItem);
    const skipped = skippedRaw.map(normalizeSkippedItem);

    allSent.push(...sent);
    allSkipped.push(...skipped);
    totalProcessed += Number(data.total ?? chunk.length);
    totalSentCount += Number(data.sent_count ?? data.sentCount ?? sent.length);
    totalSkippedCount += Number(data.skipped_count ?? data.skippedCount ?? skipped.length);
    lastMessage = response?.message || data?.message || lastMessage;
  }

  return {
    total: totalProcessed,
    sentCount: totalSentCount,
    skippedCount: totalSkippedCount,
    sent: allSent,
    skipped: allSkipped,
    message: lastMessage || "Workers Ball invites processed",
    raw: rawResponses.length === 1 ? rawResponses[0] : rawResponses,
  };
}

/**
 * 8. Fetch an invited worker's data using their invite token (public, no auth).
 * GET /api/workers-ball/invite/{token}
 */
export async function fetchWorkersBallInvite(token) {
  const cleanedToken = String(token || "").trim();
  if (!cleanedToken) {
    throw new Error("Invite token is required.");
  }

  const response = await apiRequest(
    "GET",
    `/api/workers-ball/invite/${encodeURIComponent(cleanedToken)}`,
    undefined,
    undefined,
    false
  );

  if (response?.success === false) {
    throw new Error(
      response?.message || "Invalid or expired Workers Ball invitation link."
    );
  }

  const data = response?.data ?? response ?? {};
  const workerObj =
    data?.worker && typeof data.worker === "object"
      ? data.worker
      : data?.invite?.worker && typeof data.invite.worker === "object"
        ? data.invite.worker
        : {};
  const inviteObj =
    data?.invite && typeof data.invite === "object" ? data.invite : data;

  const workerSource = {
    ...inviteObj,
    ...workerObj,
    id:
      inviteObj?.worker_id ??
      inviteObj?.workerId ??
      workerObj?.id ??
      workerObj?.worker_id ??
      inviteObj?.id,
    reference_code:
      inviteObj?.reference_code ||
      inviteObj?.referenceCode ||
      inviteObj?.code ||
      inviteObj?.access_code ||
      workerObj?.reference_code ||
      workerObj?.code ||
      "",
  };

  const normalized = normalizeWorkersBallWorker(workerSource);
  const statusStr = String(
    inviteObj?.invite_status ||
      inviteObj?.inviteStatus ||
      inviteObj?.registration_status ||
      inviteObj?.status ||
      workerObj?.invite_status ||
      ""
  )
    .trim()
    .toLowerCase();

  const confirmed = Boolean(
    normalized.registered ||
      inviteObj?.confirmed ||
      inviteObj?.is_confirmed ||
      inviteObj?.isConfirmed ||
      inviteObj?.confirmed_at ||
      inviteObj?.confirmedAt ||
      statusStr === "confirmed" ||
      statusStr === "registered" ||
      statusStr === "attended" ||
      normalized.code
  );

  const qrCode =
    data?.qrCode ||
    data?.qr_code ||
    data?.qrCodeUrl ||
    data?.qr_code_url ||
    data?.qrDataUrl ||
    data?.qr_data_url ||
    workerSource?.qrCode ||
    workerSource?.qr_code ||
    null;

  return {
    ...normalized,
    token: cleanedToken,
    registered: confirmed,
    confirmed,
    status: statusStr || (confirmed ? "confirmed" : "pending"),
    qrCode,
    raw: response,
  };
}

/**
 * 9. One-time confirmation for an invited worker (public, no auth).
 * POST /api/workers-ball/invite/{token}/confirm
 * Issues HGWB-XXXXXX + sends confirmation email.
 */
export async function confirmWorkersBallInvite(token) {
  const cleanedToken = String(token || "").trim();
  if (!cleanedToken) {
    throw new Error("Invite token is required to confirm registration.");
  }

  const response = await apiRequest(
    "POST",
    `/api/workers-ball/invite/${encodeURIComponent(cleanedToken)}/confirm`,
    {},
    undefined,
    false
  );

  if (response?.success === false) {
    throw new Error(
      response?.message || "Could not confirm your Workers Ball invitation."
    );
  }

  const data = response?.data ?? response ?? {};
  const workerObj = data?.worker || response?.worker || {};

  const messageCodeMatch = String(
    response?.message || data?.message || ""
  ).match(/HGWB-[A-Z0-9]+/i);

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
    workerObj?.reference_code ||
    workerObj?.code ||
    workerObj?.accessCode ||
    workerObj?.access_code ||
    response?.reference_code ||
    response?.code ||
    response?.accessCode ||
    response?.access_code ||
    response?.ticket ||
    (messageCodeMatch ? messageCodeMatch[0].toUpperCase() : "") ||
    deepMatch;

  const workerId =
    data?.id ??
    data?.worker_id ??
    data?.workerId ??
    workerObj?.id ??
    workerObj?.worker_id;

  const fallbackCode = workerId
    ? `HGWB-${String(workerId).padStart(6, "0")}`
    : "HGWB-2026";

  const accessCode = explicitCode ? String(explicitCode).trim().toUpperCase() : fallbackCode;

  const role =
    data?.role ||
    workerObj?.role ||
    workerObj?.worker_role ||
    data?.worker_role ||
    data?.designation ||
    response?.role ||
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

  const normalizedWorker = normalizeWorkersBallWorker({
    ...data,
    ...workerObj,
    reference_code: accessCode,
    registered: true,
  });

  return {
    raw: response,
    data,
    worker: normalizedWorker,
    accessCode,
    qrCode,
    role,
    message:
      response?.message ||
      data?.message ||
      "Invitation confirmed! Check your email for your HGWB pass and QR code.",
  };
}

/**
 * Normalize an eligible worker record returned by GET /api/workers-ball/eligible.
 */
export function normalizeWorkersBallEligibleWorker(raw = {}, index = 0) {
  const source =
    raw?.worker && typeof raw.worker === "object"
      ? { ...raw.worker, ...raw }
      : raw || {};

  const base = normalizeWorkersBallWorker(source);
  const workerId =
    source.worker_id ??
    source.workerId ??
    raw?.worker?.id ??
    raw?.worker?.worker_id ??
    source.user_id ??
    source.userId ??
    source.member_id ??
    source.memberId ??
    source.id ??
    base.id;

  const statusRaw = String(
    source.status ||
      source.invite_status ||
      source.inviteStatus ||
      source.registration_status ||
      ""
  )
    .trim()
    .toLowerCase();

  const invited = Boolean(
    source.invited ??
      source.is_invited ??
      source.isInvited ??
      source.invite_sent ??
      source.inviteSent ??
      source.invited_at ??
      source.invitedAt ??
      (statusRaw === "invited" || statusRaw === "pending")
  );

  const registered = Boolean(
    base.registered ||
      statusRaw === "registered" ||
      statusRaw === "confirmed" ||
      statusRaw === "attended" ||
      base.code
  );

  const rawInviteToken =
    source.invite_token ||
    source.inviteToken ||
    source.token ||
    "";

  const rawInviteUrl =
    source.invite_url ||
    source.inviteUrl ||
    (rawInviteToken
      ? `https://attendance.hiccgbagada.com/workers-ball/invite?token=${encodeURIComponent(
          String(rawInviteToken).trim()
        )}`
      : "");

  return {
    ...base,
    id: workerId ?? `eligible-${index + 1}`,
    workerId: workerId ?? null,
    department: base.department || "Unassigned",
    team: base.team || "Unassigned",
    invited,
    registered,
    status: registered
      ? "registered"
      : invited
        ? "invited"
        : statusRaw || "eligible",
    inviteToken: rawInviteToken ? String(rawInviteToken).trim() : "",
    inviteUrl: rawInviteUrl ? String(rawInviteUrl).trim() : "",
  };
}

/**
 * Helper to unpack a single GET /api/workers-ball/eligible response payload.
 */
function parseEligibleResponse(response) {
  let payload = response;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  if (payload && typeof payload.body === "string") {
    try {
      payload = JSON.parse(payload.body);
    } catch {
      // ignore non-JSON body string
    }
  }

  if (payload?.success === false) {
    throw new Error(
      payload?.message || "Failed to fetch eligible Workers Ball workers."
    );
  }

  const data = payload?.data ?? payload;
  let rawRows = [];

  if (Array.isArray(payload)) {
    rawRows = payload;
  } else if (Array.isArray(data)) {
    rawRows = data;
  } else if (Array.isArray(data?.eligible)) {
    rawRows = data.eligible;
  } else if (Array.isArray(data?.workers)) {
    rawRows = data.workers;
  } else if (Array.isArray(data?.rows)) {
    rawRows = data.rows;
  } else if (Array.isArray(data?.items)) {
    rawRows = data.items;
  } else if (Array.isArray(data?.results)) {
    rawRows = data.results;
  } else if (Array.isArray(data?.data)) {
    rawRows = data.data;
  } else if (Array.isArray(payload?.eligible)) {
    rawRows = payload.eligible;
  } else if (Array.isArray(payload?.workers)) {
    rawRows = payload.workers;
  } else if (data && typeof data === "object") {
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) {
        rawRows = val;
        break;
      }
    }
  }

  const workers = rawRows.map((item, idx) =>
    normalizeWorkersBallEligibleWorker(item, idx)
  );

  const paginationObj =
    data?.pagination ||
    payload?.pagination ||
    data?.meta ||
    payload?.meta ||
    {};

  const total = Number(
    paginationObj?.total ??
      data?.total ??
      data?.total_count ??
      data?.totalCount ??
      data?.count ??
      payload?.total ??
      payload?.count ??
      workers.length
  );

  const page = Number(
    paginationObj?.page ??
      paginationObj?.current_page ??
      paginationObj?.currentPage ??
      data?.page ??
      data?.current_page ??
      payload?.page ??
      1
  );

  const limit = Number(
    paginationObj?.limit ??
      paginationObj?.per_page ??
      paginationObj?.perPage ??
      data?.limit ??
      data?.per_page ??
      payload?.limit ??
      50
  );

  const totalPages = Number(
    paginationObj?.totalPages ??
      paginationObj?.total_pages ??
      paginationObj?.last_page ??
      data?.totalPages ??
      data?.total_pages ??
      data?.last_page ??
      (limit > 0 ? Math.ceil(total / limit) : 1)
  );

  return {
    workers,
    total,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    raw: payload,
  };
}

/**
 * 10. Fetch eligible workers for Workers Ball (Super Admin, requires auth).
 * GET /api/workers-ball/eligible?search=...&page=1&limit=50
 */
export async function fetchWorkersBallEligible(params = {}) {
  const { fetchAll = false, ...restParams } =
    params && typeof params === "object" ? params : {};

  const buildQuery = (pageNum, limitNum) => {
    const q = {
      page: pageNum ?? restParams.page ?? 1,
      limit: limitNum ?? restParams.limit ?? 50,
    };
    if (restParams.search && String(restParams.search).trim()) {
      q.search = String(restParams.search).trim();
    }
    if (restParams.team && restParams.team !== "All") {
      q.team = String(restParams.team).trim();
    }
    if (restParams.department && restParams.department !== "All") {
      q.department = String(restParams.department).trim();
    }
    return q;
  };

  const fetchPageWithRetry = async (pageNum, limitNum, retries = 2) => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const res = await apiRequest(
          "GET",
          "/api/workers-ball/eligible",
          buildQuery(pageNum, limitNum),
          undefined,
          true
        );
        return parseEligibleResponse(res);
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        }
      }
    }
    throw lastErr;
  };

  const requestedLimit =
    restParams.limit ?? (fetchAll ? 5000 : 50);

  let firstPage;
  try {
    firstPage = await fetchPageWithRetry(
      restParams.page ?? 1,
      requestedLimit,
      1
    );
  } catch (err) {
    if (fetchAll && !restParams.limit && requestedLimit !== 50) {
      firstPage = await fetchPageWithRetry(restParams.page ?? 1, 50, 1);
    } else {
      throw err;
    }
  }

  const effectiveLimit =
    firstPage.workers.length > 0 ? firstPage.workers.length : firstPage.limit;
  const computedTotalPages =
    firstPage.total > firstPage.workers.length && effectiveLimit > 0
      ? Math.max(
          firstPage.totalPages,
          Math.ceil(firstPage.total / effectiveLimit)
        )
      : firstPage.totalPages;

  if (
    !fetchAll ||
    computedTotalPages <= 1 ||
    firstPage.workers.length === 0 ||
    firstPage.workers.length >= firstPage.total
  ) {
    return firstPage;
  }

  // Fetch remaining pages sequentially in small batches of 2 with retry so no page is dropped by rate-limiting
  const pageStepLimit = effectiveLimit;
  const maxPages = Math.min(computedTotalPages, 40);
  const allRows = [...firstPage.workers];

  for (let p = 2; p <= maxPages; p += 2) {
    const batchPages = [p];
    if (p + 1 <= maxPages) {
      batchPages.push(p + 1);
    }
    const batchResults = await Promise.all(
      batchPages.map((pageNum) =>
        fetchPageWithRetry(pageNum, pageStepLimit, 2).catch(() => ({
          workers: [],
        }))
      )
    );
    batchResults.forEach((pageRes) => {
      if (Array.isArray(pageRes.workers)) {
        allRows.push(...pageRes.workers);
      }
    });
  }

  // Deduplicate by stable worker identifier (workerId / id / email / phone+name)
  const mergedMap = new Map();
  allRows.forEach((w, idx) => {
    const rawId =
      w.workerId !== null &&
      w.workerId !== undefined &&
      !String(w.workerId).startsWith("eligible-")
        ? `id:${w.workerId}`
        : w.id !== null &&
            w.id !== undefined &&
            !String(w.id).startsWith("eligible-")
          ? `id:${w.id}`
          : w.email
            ? `email:${String(w.email).toLowerCase()}`
            : `row:${w.name || ""}:${w.phone || ""}:${idx}`;
    if (!mergedMap.has(rawId)) {
      mergedMap.set(rawId, w);
    }
  });

  const allWorkers = Array.from(mergedMap.values());
  return {
    ...firstPage,
    workers: allWorkers,
    total: Math.max(firstPage.total, allWorkers.length),
    totalPages: computedTotalPages,
  };
}
