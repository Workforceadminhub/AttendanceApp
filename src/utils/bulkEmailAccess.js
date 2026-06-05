import { getUserRole } from "./getUserRole";

/**
 * Extra login codes that are granted Bulk Email access in addition to
 * Super Admins and Church Admins. Matched case-insensitively against the
 * user's login code.
 *
 * Keep this in sync with the BULK_EMAIL_ALLOWLIST env var used by the
 * serverless function (api/send-bulk-email.js), which enforces it server-side.
 */
export const BULK_EMAIL_ALLOWLIST = ["tolutrain", "ayo"];

const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

/**
 * Whether the given user may access Bulk Email.
 * Super Admins and Church Admins always can; otherwise the user's login code
 * must be in the allowlist.
 *
 * @param {Object} [user] - authUser object (defaults to the current session user).
 * @returns {boolean}
 */
export function canSendBulkEmail(user) {
  const { isSuperAdmin, isChurchAdmin, user: current } = getUserRole();
  if (isSuperAdmin || isChurchAdmin) return true;

  const u = user ?? current;
  const code = normalize(u?.code);
  return code !== "" && BULK_EMAIL_ALLOWLIST.map(normalize).includes(code);
}

export default canSendBulkEmail;
