// Bulk send goes to a same-origin Vercel serverless function (api/send-bulk-email.js),
// NOT the AWS API. The function holds the Resend key server-side and verifies the
// caller's token, so we call it directly with fetch rather than via apiClient.

/**
 * Parse a free-form recipients string (pasted list / CSV column) into a clean,
 * de-duplicated array of valid email addresses, plus the rejected entries.
 *
 * Accepts addresses separated by commas, semicolons, spaces, or newlines.
 *
 * @param {string} raw
 * @returns {{ valid: string[], invalid: string[] }}
 */
export const parseRecipients = (raw = "") => {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const tokens = String(raw)
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const valid = [];
  const invalid = [];
  const seen = new Set();

  for (const token of tokens) {
    const addr = token.toLowerCase();
    if (!EMAIL_RE.test(addr)) {
      invalid.push(token);
      continue;
    }
    if (seen.has(addr)) continue;
    seen.add(addr);
    valid.push(addr);
  }

  return { valid, invalid };
};

/**
 * Send a bulk email via the same-origin serverless function, which delivers
 * through Resend. The function verifies the caller's session token, so we
 * forward the stored access token as a Bearer header.
 *
 * Endpoint — POST /api/send-bulk-email
 *   { subject: string, html: string, recipients: string[] }
 * The function sends one message per recipient so addresses are never exposed.
 *
 * @param {Object} payload
 * @param {string} payload.subject
 * @param {string} payload.html        Fully rendered, email-safe HTML.
 * @param {string[]} payload.recipients
 * @param {"resend"|"brevo"} [payload.provider]  Which provider to send through.
 * @returns {Promise<{ provider: string, sent: number, failed: string[] }>} Send result.
 */
export const sendBulkEmail = async ({ subject, html, recipients, provider }) => {
  if (!subject || !subject.trim()) {
    throw new Error("Subject is required.");
  }
  if (!html || !html.trim()) {
    throw new Error("Email body is empty.");
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("At least one recipient is required.");
  }

  const token = sessionStorage.getItem("accessToken");
  // The caller's login code lets the function authorize allowlisted users when
  // the JWT doesn't embed it. It's only trusted after the token is verified
  // server-side, so it can't be used to bypass auth.
  let requesterCode;
  try {
    requesterCode = JSON.parse(sessionStorage.getItem("authUser") || "{}")?.code;
  } catch {
    requesterCode = undefined;
  }

  const res = await fetch("/api/send-bulk-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      subject: subject.trim(),
      html,
      recipients,
      ...(provider ? { provider } : {}),
      ...(requesterCode ? { requesterCode } : {}),
    }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response (e.g. HTML error page)
  }

  if (!res.ok || !data || data.error) {
    const detail = data?.reason ? ` (${data.reason})` : "";
    throw new Error(
      (data?.error || `Failed to send bulk email (HTTP ${res.status}).`) + detail
    );
  }
  return data;
};

/**
 * Fetch the running list of bulk sends with aggregated deliverability,
 * from the same-origin report function.
 * @returns {Promise<{ sends: Array }>}
 */
export const fetchEmailReport = async () => {
  const token = sessionStorage.getItem("accessToken");
  let requesterCode;
  try {
    requesterCode = JSON.parse(sessionStorage.getItem("authUser") || "{}")?.code;
  } catch {
    requesterCode = undefined;
  }
  const qs = requesterCode ? `?requesterCode=${encodeURIComponent(requesterCode)}` : "";

  const res = await fetch(`/api/email-report${qs}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || !data || data.error) {
    const detail = data?.reason ? ` (${data.reason})` : "";
    throw new Error((data?.error || `Failed to load report (HTTP ${res.status}).`) + detail);
  }
  return data;
};

export default sendBulkEmail;
