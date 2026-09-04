/** Shared validation rules for the meeting confirm / present forms. */

export const isDistrictsTeam = (team) => team === "Districts" || team === "District";

export const phoneDigits = (raw) => String(raw ?? "").replace(/\D/g, "");

/**
 * Confirm-form and create-worker phone rule: exactly 11 digits (local format, e.g. 08012345678).
 */
export const isElevenDigitPhone = (raw) => phoneDigits(raw).length === 11;

export const ELEVEN_DIGIT_PHONE_MESSAGE = "Phone number must be exactly 11 digits";

/**
 * Present-form phone rule: 10 digits (local without 0), 11 digits (with 0),
 * or 13-14 digits (234 / +234 prefix).
 */
export const isValidPresentPhone = (raw) => {
  const len = phoneDigits(raw).length;
  return len >= 10 && len <= 14;
};

export const PRESENT_PHONE_MESSAGE =
  "Enter a valid phone: 11 digits starting with 0, or 234/+234, or local without leading 0";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (raw) => EMAIL_RE.test(String(raw ?? "").trim());

export const isValidOptionalEmail = (raw) => {
  const trimmed = String(raw ?? "").trim();
  return !trimmed || EMAIL_RE.test(trimmed);
};

/**
 * Splits a worker record (or a free-text name) into first / last / other names.
 * Prefers explicit firstname/lastname fields when present.
 */
export function splitWorkerName(worker) {
  if (worker?.firstname || worker?.lastname) {
    return {
      firstname: worker.firstname || "",
      lastname: worker.lastname || "",
      othername: worker.othername || "",
    };
  }
  const parts = String(worker?.name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstname: parts[0] || "",
    lastname: parts.length > 1 ? parts[parts.length - 1] : "",
    othername: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
  };
}
