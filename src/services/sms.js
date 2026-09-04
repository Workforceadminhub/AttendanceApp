import { getAccessToken } from "../utils/authSession";

/**
 * Standard GSM 7-bit basic character set check
 */
const GSM_7BIT_REGEX =
  /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~\]|€]*$/;

/**
 * Clean and normalize a raw phone number into Sendchamp standard format
 * (e.g. 2348012345678 without leading + or 0)
 *
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizePhoneNumber(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");

  // Nigerian local without leading zero: 10 digits (e.g. 8031234567 -> 2348031234567)
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return `234${digits}`;
  }

  // Nigerian local with leading zero: 11 digits (e.g. 08031234567 -> 2348031234567)
  if (digits.length === 11 && digits.startsWith("0")) {
    return `234${digits.slice(1)}`;
  }

  // International Nigerian with 234 prefix: 13 digits (e.g. 2348031234567)
  if (digits.length === 13 && digits.startsWith("234")) {
    return digits;
  }

  // Other general international numbers (10 - 15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

/**
 * Parse a free-form recipients string (CSV / comma / newline separated numbers)
 * into a deduplicated array of valid normalized numbers and invalid tokens.
 *
 * @param {string} raw
 * @returns {{ valid: string[], invalid: string[], duplicates: number }}
 */
export function parsePhoneRecipients(raw = "") {
  const tokens = String(raw)
    .split(/[\s,;\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const valid = [];
  const invalid = [];
  const seen = new Set();
  let duplicates = 0;

  for (const token of tokens) {
    const normalized = normalizePhoneNumber(token);
    if (!normalized) {
      invalid.push(token);
      continue;
    }
    if (seen.has(normalized)) {
      duplicates++;
      continue;
    }
    seen.add(normalized);
    valid.push(normalized);
  }

  return { valid, invalid, duplicates };
}

/**
 * Calculate SMS segments and character limits
 * - GSM standard: 160 chars for 1 segment, 153 chars per segment for multi-part
 * - Unicode: 70 chars for 1 segment, 67 chars per segment for multi-part
 *
 * @param {string} message
 * @returns {{ chars: number, segments: number, isUnicode: boolean, maxPerSegment: number, charsLeftInSegment: number }}
 */
export function calculateSmsSegments(message = "") {
  const text = String(message || "");
  const chars = text.length;

  if (chars === 0) {
    return {
      chars: 0,
      segments: 0,
      isUnicode: false,
      maxPerSegment: 160,
      charsLeftInSegment: 160,
    };
  }

  const isUnicode = !GSM_7BIT_REGEX.test(text);

  let segments = 1;
  let maxPerSegment = isUnicode ? 70 : 160;
  let multiPartMax = isUnicode ? 67 : 153;

  if (chars <= maxPerSegment) {
    segments = 1;
    return {
      chars,
      segments,
      isUnicode,
      maxPerSegment,
      charsLeftInSegment: maxPerSegment - chars,
    };
  }

  segments = Math.ceil(chars / multiPartMax);
  const charsUsedInLastSegment = chars % multiPartMax === 0 ? multiPartMax : chars % multiPartMax;
  const charsLeftInSegment = multiPartMax - charsUsedInLastSegment;

  return {
    chars,
    segments,
    isUnicode,
    maxPerSegment: multiPartMax,
    charsLeftInSegment,
  };
}

/**
 * Send bulk SMS via Vercel serverless function
 *
 * @param {Object} params
 * @param {string} params.message
 * @param {string[]} params.recipients
 * @param {string} [params.senderName]
 * @param {"non_dnd"|"dnd"|"international"} [params.route]
 * @param {"sendchamp"|"smartsmssolutions"} [params.provider]
 * @returns {Promise<Object>}
 */
export async function sendBulkSms({
  message,
  recipients,
  senderName = "Sendchamp",
  route = "non_dnd",
  provider = "sendchamp",
}) {
  if (!message || !message.trim()) {
    throw new Error("Message text is required.");
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("At least one recipient phone number is required.");
  }

  const token = getAccessToken();

  const res = await fetch("/api/send-bulk-sms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message: message.trim(),
      recipients,
      sender_name: senderName.trim() || (provider === "smartsmssolutions" ? "HICC" : "Sendchamp"),
      route: route || "non_dnd",
      provider: provider || "sendchamp",
    }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok || !data || data.error) {
    throw new Error(data?.error || `Failed to send SMS (HTTP ${res.status}).`);
  }

  return data;
}

/**
 * Fetch live wallet balance for provider
 *
 * @param {"sendchamp"|"smartsmssolutions"} [provider]
 * @returns {Promise<Object>}
 */
export async function fetchSmsBalance(provider = "sendchamp") {
  const token = getAccessToken();

  const res = await fetch(`/api/sms-balance?provider=${encodeURIComponent(provider)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON
  }

  if (!res.ok || !data || data.error) {
    throw new Error(data?.error || `Failed to fetch wallet balance (HTTP ${res.status}).`);
  }

  return data.data;
}
