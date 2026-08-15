import { getUserRole } from "./getUserRole";

/**
 * Check if current user is authorized to send Bulk SMS.
 * Restricted strictly to Super Admins.
 *
 * @returns {boolean}
 */
export function canSendBulkSms() {
  const { isSuperAdmin } = getUserRole();
  return Boolean(isSuperAdmin);
}

export default canSendBulkSms;
