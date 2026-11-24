import { getUserRole } from "./getUserRole";

/**
 * Whether the given user is known client-side to have Bulk Email access.
 * Super Admins always can; Church Admins cannot; other accounts may be
 * granted access via a backend capability flag (`canSendBulkEmail`) or the
 * server-only `BULK_EMAIL_ALLOWLIST` env var (verified via `checkBulkEmailAccess`).
 *
 * Login codes / Pass IDs must never be hardcoded in the client bundle.
 *
 * @param {Object} [user] - authUser object (defaults to the current session user).
 * @returns {boolean}
 */
export function canSendBulkEmail(user) {
  const { isSuperAdmin, isChurchAdmin, user: current } = getUserRole(user);
  if (isSuperAdmin) return true;
  if (isChurchAdmin) return false;

  const u = user ?? current;
  return Boolean(u?.canSendBulkEmail);
}

export default canSendBulkEmail;
